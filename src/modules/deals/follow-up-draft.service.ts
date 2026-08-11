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
import { DraftFollowUpResponseDto } from './dto/draft-follow-up-response.dto';

const RECENT_ACTIVITIES_LIMIT = 10;
const DRAFT_TOOL_NAME = 'submit_followup_draft';

const DRAFT_TOOL: Anthropic.Tool = {
  name: DRAFT_TOOL_NAME,
  description: 'Submit the drafted follow-up email for this deal.',
  input_schema: {
    type: 'object',
    properties: {
      subject: { type: 'string', description: 'Email subject line' },
      body: {
        type: 'string',
        description:
          'Email body, plain text, professional and concise tone, ready to edit and send',
      },
    },
    required: ['subject', 'body'],
  },
};

type DealWithContext = {
  title: string;
  value: unknown;
  contact: Contact & { company: Pick<Company, 'name'> | null };
  pipelineStage: PipelineStage;
};

@Injectable()
export class FollowUpDraftService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly dealsService: DealsService,
    @Inject(ANTHROPIC_CLIENT) private readonly anthropic: Anthropic,
  ) {}

  async draftFollowUp(
    user: AuthenticatedUser,
    dealId: string,
  ): Promise<DraftFollowUpResponseDto> {
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

    const activities = await this.prisma.activity.findMany({
      where: {
        organizationId: user.organizationId,
        OR: [{ dealId: deal.id }, { contactId: deal.contactId }],
      },
      orderBy: { occurredAt: 'desc' },
      take: RECENT_ACTIVITIES_LIMIT,
    });

    const message = await this.anthropic.messages.create({
      model:
        this.configService.get<string>('ANTHROPIC_MODEL') ??
        DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 800,
      tools: [DRAFT_TOOL],
      tool_choice: { type: 'tool', name: DRAFT_TOOL_NAME },
      messages: [{ role: 'user', content: this.buildPrompt(deal, activities) }],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );
    if (!toolUse) {
      throw new InternalServerErrorException(
        'Claude did not return a follow-up draft',
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
      'You are a sales assistant for a CRM, drafting a follow-up email on behalf of a sales rep to send to a contact.',
      '',
      `Deal: "${deal.title}" (value: ${String(deal.value)}, stage: ${deal.pipelineStage.name})`,
      `Contact: ${contact.firstName} ${contact.lastName}${companyLine}`,
      `Email: ${contact.email ?? '(none)'}`,
      '',
      'Recent activity (most recent first):',
      activityLines,
      '',
      "Draft a short, professional follow-up email to this contact appropriate for the deal's current stage. Do not invent facts not supported by the activity history above.",
      `Call the ${DRAFT_TOOL_NAME} tool with the subject and body.`,
    ].join('\n');
  }

  private parseToolInput(input: unknown): DraftFollowUpResponseDto {
    if (
      typeof input !== 'object' ||
      input === null ||
      typeof (input as Record<string, unknown>).subject !== 'string' ||
      typeof (input as Record<string, unknown>).body !== 'string'
    ) {
      throw new InternalServerErrorException(
        'Claude returned an unexpected response shape',
      );
    }

    const raw = input as { subject: string; body: string };
    return { subject: raw.subject, body: raw.body };
  }
}
