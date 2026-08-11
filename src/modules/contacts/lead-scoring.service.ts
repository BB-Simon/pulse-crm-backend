import Anthropic from '@anthropic-ai/sdk';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Activity, Company, Contact } from '@prisma/client';
import { ANTHROPIC_CLIENT } from '../ai/anthropic-client.token';
import { DEFAULT_ANTHROPIC_MODEL } from '../ai/ai.constants';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from './contacts.service';
import { LeadScoreResponseDto } from './dto/lead-score-response.dto';

const SCORE_TOOL_NAME = 'submit_lead_score';

const SCORE_TOOL: Anthropic.Tool = {
  name: SCORE_TOOL_NAME,
  description:
    'Submit the computed lead score (0-100) and a short rationale for this contact.',
  input_schema: {
    type: 'object',
    properties: {
      score: {
        type: 'integer',
        minimum: 0,
        maximum: 100,
        description: 'Lead score from 0 (cold) to 100 (hot)',
      },
      rationale: {
        type: 'string',
        description: 'A short 1-2 sentence rationale for the score',
      },
    },
    required: ['score', 'rationale'],
  },
};

type ContactWithContext = Contact & {
  company: Pick<Company, 'name'> | null;
  activities: Activity[];
};

@Injectable()
export class LeadScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly contactsService: ContactsService,
    @Inject(ANTHROPIC_CLIENT) private readonly anthropic: Anthropic,
  ) {}

  async scoreContact(
    user: AuthenticatedUser,
    contactId: string,
  ): Promise<LeadScoreResponseDto> {
    // Visibility check (throws 404 if the contact doesn't exist or isn't
    // visible to this user) — reused from ContactsService rather than
    // re-deriving the Rep-ownership rule here.
    await this.contactsService.findOne(user, contactId);

    if (!this.configService.get<string>('ANTHROPIC_API_KEY')) {
      throw new InternalServerErrorException(
        'Claude is not configured for this environment',
      );
    }

    const contact = await this.prisma.contact.findUniqueOrThrow({
      where: { id: contactId },
      include: {
        company: { select: { name: true } },
        activities: { orderBy: { occurredAt: 'asc' } },
      },
    });

    const message = await this.anthropic.messages.create({
      model:
        this.configService.get<string>('ANTHROPIC_MODEL') ??
        DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 500,
      tools: [SCORE_TOOL],
      tool_choice: { type: 'tool', name: SCORE_TOOL_NAME },
      messages: [{ role: 'user', content: this.buildPrompt(contact) }],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );
    if (!toolUse) {
      throw new InternalServerErrorException(
        'Claude did not return a lead score',
      );
    }

    const { score, rationale } = this.parseToolInput(toolUse.input);

    const updated = await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        leadScore: score,
        leadScoreRationale: rationale,
        leadScoredAt: new Date(),
      },
    });

    return {
      score: updated.leadScore!,
      rationale: updated.leadScoreRationale!,
      scoredAt: updated.leadScoredAt!,
    };
  }

  private buildPrompt(contact: ContactWithContext): string {
    const companyLine = contact.company
      ? `Company: ${contact.company.name}`
      : 'Company: (none)';
    const tagsLine =
      contact.tags.length > 0
        ? `Tags: ${contact.tags.join(', ')}`
        : 'Tags: (none)';

    const activityLines =
      contact.activities.length > 0
        ? contact.activities
            .map(
              (activity) =>
                `- [${activity.type}] ${activity.occurredAt.toISOString().slice(0, 10)}: ${activity.content}`,
            )
            .join('\n')
        : '(No activity logged yet.)';

    return [
      'You are a sales lead-scoring assistant for a CRM. Score how promising this lead is on a scale of 0-100 (0 = cold/unlikely to convert, 100 = extremely hot/ready to close), based on their profile and activity history.',
      '',
      `Contact: ${contact.firstName} ${contact.lastName}`,
      `Email: ${contact.email ?? '(none)'}`,
      companyLine,
      tagsLine,
      '',
      'Activity history (chronological):',
      activityLines,
      '',
      `Call the ${SCORE_TOOL_NAME} tool with your score and a short 1-2 sentence rationale.`,
    ].join('\n');
  }

  private parseToolInput(input: unknown): { score: number; rationale: string } {
    if (
      typeof input !== 'object' ||
      input === null ||
      typeof (input as Record<string, unknown>).score !== 'number' ||
      typeof (input as Record<string, unknown>).rationale !== 'string'
    ) {
      throw new InternalServerErrorException(
        'Claude returned an unexpected response shape',
      );
    }

    const raw = input as { score: number; rationale: string };
    const score = Math.max(0, Math.min(100, Math.round(raw.score)));
    return { score, rationale: raw.rationale };
  }
}
