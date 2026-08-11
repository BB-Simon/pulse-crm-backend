import Anthropic from '@anthropic-ai/sdk';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Activity, Company, Contact, PipelineStage } from '@prisma/client';
import { DEFAULT_ANTHROPIC_MODEL } from '../ai/ai.constants';
import { ANTHROPIC_CLIENT } from '../ai/anthropic-client.token';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { DealsService } from './deals.service';
import { DealSummaryResponseDto } from './dto/deal-summary-response.dto';

const SUMMARY_TOOL_NAME = 'submit_deal_summary';

const SUMMARY_TOOL: Anthropic.Tool = {
  name: SUMMARY_TOOL_NAME,
  description: 'Submit a short "catch me up" summary for this deal.',
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description:
          "A short 2-4 sentence paragraph summarizing this deal's history and current state, for a rep about to review it",
      },
    },
    required: ['summary'],
  },
};

type DealWithContext = {
  title: string;
  value: unknown;
  status: string;
  contact: Contact & { company: Pick<Company, 'name'> | null };
  pipelineStage: PipelineStage;
};

@Injectable()
export class DealSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly dealsService: DealsService,
    @Inject(ANTHROPIC_CLIENT) private readonly anthropic: Anthropic,
  ) {}

  async summarizeDeal(
    user: AuthenticatedUser,
    dealId: string,
  ): Promise<DealSummaryResponseDto> {
    // Visibility check (throws 404 if the deal doesn't exist or isn't visible
    // to this user) — reused from DealsService rather than re-deriving the
    // Rep-ownership rule here.
    await this.dealsService.findOne(user, dealId);

    if (!this.configService.get<string>('ANTHROPIC_API_KEY')) {
      throw new InternalServerErrorException(
        'Claude is not configured for this environment',
      );
    }

    const deal = await this.prisma.deal.findUniqueOrThrow({
      where: { id: dealId },
      include: {
        contact: { include: { company: { select: { name: true } } } },
        pipelineStage: true,
      },
    });

    // Full history (unlike the follow-up draft, which only needs recent
    // activity) — a "catch me up" summary should reflect everything.
    const activities = await this.prisma.activity.findMany({
      where: {
        organizationId: user.organizationId,
        OR: [{ dealId: deal.id }, { contactId: deal.contactId }],
      },
      orderBy: { occurredAt: 'asc' },
    });

    const message = await this.anthropic.messages.create({
      model:
        this.configService.get<string>('ANTHROPIC_MODEL') ??
        DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 500,
      tools: [SUMMARY_TOOL],
      tool_choice: { type: 'tool', name: SUMMARY_TOOL_NAME },
      messages: [{ role: 'user', content: this.buildPrompt(deal, activities) }],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );
    if (!toolUse) {
      throw new InternalServerErrorException(
        'Claude did not return a deal summary',
      );
    }

    return this.parseToolInput(toolUse.input);
  }

  private buildPrompt(deal: DealWithContext, activities: Activity[]): string {
    const { contact } = deal;
    const companyLine = contact.company ? ` at ${contact.company.name}` : '';

    const activityLines =
      activities.length > 0
        ? activities
            .map(
              (activity) =>
                `- [${activity.type}] ${activity.occurredAt.toISOString().slice(0, 10)}: ${activity.content}`,
            )
            .join('\n')
        : '(No activity logged yet.)';

    return [
      'You are a sales assistant for a CRM. Write a short "catch me up" summary for a sales rep who is about to review this deal, based on its full activity history.',
      '',
      `Deal: "${deal.title}" (value: ${String(deal.value)}, stage: ${deal.pipelineStage.name}, status: ${deal.status})`,
      `Contact: ${contact.firstName} ${contact.lastName}${companyLine}`,
      '',
      'Full activity history (chronological):',
      activityLines,
      '',
      `Call the ${SUMMARY_TOOL_NAME} tool with your summary paragraph.`,
    ].join('\n');
  }

  private parseToolInput(input: unknown): DealSummaryResponseDto {
    if (
      typeof input !== 'object' ||
      input === null ||
      typeof (input as Record<string, unknown>).summary !== 'string'
    ) {
      throw new InternalServerErrorException(
        'Claude returned an unexpected response shape',
      );
    }

    return { summary: (input as { summary: string }).summary };
  }
}
