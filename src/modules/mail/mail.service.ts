import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

const DEFAULT_FROM_EMAIL = 'PulseCRM <onboarding@resend.dev>';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ?? DEFAULT_FROM_EMAIL;
  }

  async sendInviteEmail(params: {
    to: string;
    organizationName: string;
    inviterName: string;
    acceptUrl: string;
  }): Promise<void> {
    await this.send({
      to: params.to,
      subject: `You've been invited to join ${params.organizationName} on PulseCRM`,
      html: `<p>${params.inviterName} invited you to join <strong>${params.organizationName}</strong> on PulseCRM.</p><p><a href="${params.acceptUrl}">Accept your invite</a></p>`,
      text: `${params.inviterName} invited you to join ${params.organizationName} on PulseCRM. Accept your invite: ${params.acceptUrl}`,
    });
  }

  async sendDealStageChangedEmail(params: {
    to: string;
    dealTitle: string;
    fromStage: string;
    toStage: string;
  }): Promise<void> {
    await this.send({
      to: params.to,
      subject: `Deal "${params.dealTitle}" moved to ${params.toStage}`,
      html: `<p>Your deal <strong>${params.dealTitle}</strong> moved from ${params.fromStage} to <strong>${params.toStage}</strong>.</p>`,
      text: `Your deal "${params.dealTitle}" moved from ${params.fromStage} to ${params.toStage}.`,
    });
  }

  async sendTaskOverdueEmail(params: {
    to: string;
    taskTitle: string;
    dueDate: string;
  }): Promise<void> {
    const dueDateLabel = new Date(params.dueDate).toLocaleDateString();
    await this.send({
      to: params.to,
      subject: `Task overdue: ${params.taskTitle}`,
      html: `<p>Your task <strong>${params.taskTitle}</strong> was due on ${dueDateLabel} and is now overdue.</p>`,
      text: `Your task "${params.taskTitle}" was due on ${dueDateLabel} and is now overdue.`,
    });
  }

  async sendLeadAssignedEmail(params: {
    to: string;
    contactName: string;
  }): Promise<void> {
    await this.send({
      to: params.to,
      subject: `New lead assigned: ${params.contactName}`,
      html: `<p>You've been assigned a new lead: <strong>${params.contactName}</strong>.</p>`,
      text: `You've been assigned a new lead: ${params.contactName}.`,
    });
  }

  private async send(params: SendEmailParams): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `[stub email — RESEND_API_KEY not configured] To: ${params.to} | Subject: ${params.subject}`,
      );
      return;
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      if (error) {
        this.logger.error(
          `Resend rejected email to ${params.to}: ${error.message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${params.to}: ${(error as Error).message}`,
      );
    }
  }
}
