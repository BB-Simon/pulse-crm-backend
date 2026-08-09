import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Plan, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutSessionResponseDto } from './dto/checkout-session-response.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { PortalSessionResponseDto } from './dto/portal-session-response.dto';
import { PLAN_CATALOG, PLAN_ORDER } from './plan-catalog';
import { STRIPE_CLIENT } from './stripe-client.token';

const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
  ) {}

  async createCheckoutSession(
    user: AuthenticatedUser,
    dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    if (!this.configService.get<string>('STRIPE_SECRET_KEY')) {
      throw new InternalServerErrorException(
        'Stripe is not configured for this environment',
      );
    }

    const planDefinition = PLAN_CATALOG[dto.plan];
    const priceId = this.configService.get<string>(
      planDefinition.stripePriceEnvVar,
    );
    if (!priceId) {
      throw new BadRequestException(
        `The ${planDefinition.name} plan is not currently available for checkout`,
      );
    }

    const [organization, subscription, admin] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: user.organizationId },
      }),
      this.prisma.subscription.findUnique({
        where: { organizationId: user.organizationId },
      }),
      this.prisma.user.findUnique({ where: { id: user.id } }),
    ]);

    if (!organization || !admin) {
      throw new NotFoundException('Organization or user not found');
    }
    if (!subscription) {
      throw new NotFoundException(
        'No subscription found for this organization',
      );
    }

    const stripeCustomerId =
      subscription.stripeCustomerId ??
      (await this.createStripeCustomer(
        organization.id,
        organization.name,
        admin.email,
      ));

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? DEFAULT_FRONTEND_URL;

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      client_reference_id: organization.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/billing?checkout=cancelled`,
      subscription_data: {
        metadata: { organizationId: organization.id, plan: dto.plan },
      },
      metadata: { organizationId: organization.id, plan: dto.plan },
    });

    if (!session.url) {
      throw new InternalServerErrorException(
        'Stripe did not return a checkout URL',
      );
    }

    return { url: session.url, sessionId: session.id };
  }

  async createPortalSession(
    user: AuthenticatedUser,
  ): Promise<PortalSessionResponseDto> {
    if (!this.configService.get<string>('STRIPE_SECRET_KEY')) {
      throw new InternalServerErrorException(
        'Stripe is not configured for this environment',
      );
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
    });
    if (!subscription) {
      throw new NotFoundException(
        'No subscription found for this organization',
      );
    }
    if (!subscription.stripeCustomerId) {
      throw new BadRequestException(
        'This organization has no billing account yet — subscribe to a plan first',
      );
    }

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? DEFAULT_FRONTEND_URL;

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${frontendUrl}/billing`,
    });

    return { url: session.url };
  }

  async handleWebhookEvent(
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<{ received: true }> {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new InternalServerErrorException(
        'Stripe webhook secret is not configured',
      );
    }
    if (!signature) {
      throw new BadRequestException('Missing Stripe-Signature header');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (error) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${(error as Error).message}`,
      );
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.syncSubscriptionRecord(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    if (session.mode !== 'subscription' || !session.subscription) {
      return;
    }

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id;

    const stripeSubscription =
      await this.stripe.subscriptions.retrieve(subscriptionId);
    await this.syncSubscriptionRecord(stripeSubscription);
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const subscriptionRef = invoice.parent?.subscription_details?.subscription;
    const stripeSubscriptionId =
      typeof subscriptionRef === 'string'
        ? subscriptionRef
        : subscriptionRef?.id;

    const customerRef = invoice.customer;
    const stripeCustomerId =
      typeof customerRef === 'string' ? customerRef : customerRef?.id;

    if (!stripeSubscriptionId && !stripeCustomerId) {
      this.logger.warn(
        `invoice.payment_failed event ${invoice.id} has no subscription or customer reference`,
      );
      return;
    }

    const subscription = stripeSubscriptionId
      ? await this.prisma.subscription.findUnique({
          where: { stripeSubscriptionId },
        })
      : await this.prisma.subscription.findUnique({
          where: { stripeCustomerId },
        });

    if (!subscription) {
      this.logger.warn(
        `No local subscription found for failed invoice ${invoice.id}`,
      );
      return;
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.PAST_DUE },
    });
  }

  private async syncSubscriptionRecord(
    stripeSubscription: Stripe.Subscription,
  ): Promise<void> {
    const organizationId = await this.resolveOrganizationId(stripeSubscription);
    if (!organizationId) {
      this.logger.warn(
        `Unable to resolve organization for Stripe subscription ${stripeSubscription.id}`,
      );
      return;
    }

    const customerId =
      typeof stripeSubscription.customer === 'string'
        ? stripeSubscription.customer
        : stripeSubscription.customer.id;
    const plan = this.resolvePlan(stripeSubscription);
    const planDefinition = plan ? PLAN_CATALOG[plan] : null;
    const status = this.mapSubscriptionStatus(stripeSubscription.status);
    const periodEndSeconds =
      stripeSubscription.items.data[0]?.current_period_end;
    const currentPeriodEnd = periodEndSeconds
      ? new Date(periodEndSeconds * 1000)
      : null;

    await this.prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        plan: plan ?? Plan.STARTER,
        status,
        seatLimit:
          planDefinition?.seatLimit ?? PLAN_CATALOG[Plan.STARTER].seatLimit,
        contactLimit:
          planDefinition?.contactLimit ??
          PLAN_CATALOG[Plan.STARTER].contactLimit,
        currentPeriodEnd,
      },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        status,
        currentPeriodEnd,
        ...(plan && planDefinition
          ? {
              plan,
              seatLimit: planDefinition.seatLimit,
              contactLimit: planDefinition.contactLimit,
            }
          : {}),
      },
    });
  }

  private async resolveOrganizationId(
    stripeSubscription: Stripe.Subscription,
  ): Promise<string | null> {
    const metadataOrgId = stripeSubscription.metadata?.organizationId;
    if (metadataOrgId) {
      return metadataOrgId;
    }

    const customerId =
      typeof stripeSubscription.customer === 'string'
        ? stripeSubscription.customer
        : stripeSubscription.customer.id;

    const existing = await this.prisma.subscription.findUnique({
      where: { stripeCustomerId: customerId },
    });
    return existing?.organizationId ?? null;
  }

  private resolvePlan(stripeSubscription: Stripe.Subscription): Plan | null {
    const metadataPlan = stripeSubscription.metadata?.plan;
    if (
      metadataPlan &&
      (Object.values(Plan) as string[]).includes(metadataPlan)
    ) {
      return metadataPlan as Plan;
    }

    const priceId = stripeSubscription.items.data[0]?.price?.id;
    if (!priceId) {
      return null;
    }

    return (
      PLAN_ORDER.find(
        (plan) =>
          this.configService.get<string>(
            PLAN_CATALOG[plan].stripePriceEnvVar,
          ) === priceId,
      ) ?? null
    );
  }

  private mapSubscriptionStatus(
    status: Stripe.Subscription.Status,
  ): SubscriptionStatus {
    switch (status) {
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'unpaid':
        return SubscriptionStatus.UNPAID;
      case 'incomplete':
        return SubscriptionStatus.INCOMPLETE;
      case 'incomplete_expired':
        return SubscriptionStatus.INCOMPLETE_EXPIRED;
      default:
        this.logger.warn(
          `Unmapped Stripe subscription status "${status}", defaulting to UNPAID`,
        );
        return SubscriptionStatus.UNPAID;
    }
  }

  private async createStripeCustomer(
    organizationId: string,
    organizationName: string,
    adminEmail: string,
  ): Promise<string> {
    const customer = await this.stripe.customers.create({
      name: organizationName,
      email: adminEmail,
      metadata: { organizationId },
    });

    await this.prisma.subscription.update({
      where: { organizationId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }
}
