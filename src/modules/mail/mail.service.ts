import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendInviteEmail(params: {
    to: string;
    organizationName: string;
    inviterName: string;
    acceptUrl: string;
  }): Promise<void> {
    // TODO: replace with a real provider (Resend/SendGrid) via the notification queue.
    this.logger.log(
      `[stub email] To: ${params.to} | Subject: You've been invited to join ${params.organizationName} on PulseCRM\n` +
        `${params.inviterName} invited you to join ${params.organizationName}. Accept your invite: ${params.acceptUrl}`,
    );
    return Promise.resolve();
  }
}
