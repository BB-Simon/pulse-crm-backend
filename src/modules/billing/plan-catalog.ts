import { Plan } from '@prisma/client';

export interface PlanDefinition {
  key: Plan;
  name: string;
  description: string;
  /** Price per seat, per month, in the smallest currency unit (e.g. cents). */
  pricePerSeatCents: number;
  currency: string;
  seatLimit: number;
  contactLimit: number;
  /** Env var that holds this plan's Stripe recurring Price id once provisioned. */
  stripePriceEnvVar: string;
  /** Stable key used to find/reuse the Stripe Price across re-runs of the setup script. */
  stripeLookupKey: string;
}

export const PLAN_ORDER: Plan[] = [Plan.STARTER, Plan.GROWTH, Plan.SCALE];

export const PLAN_CATALOG: Record<Plan, PlanDefinition> = {
  [Plan.STARTER]: {
    key: Plan.STARTER,
    name: 'Starter',
    description: 'For small teams just getting started with PulseCRM.',
    pricePerSeatCents: 2900,
    currency: 'usd',
    seatLimit: 5,
    contactLimit: 1_000,
    stripePriceEnvVar: 'STRIPE_PRICE_STARTER',
    stripeLookupKey: 'pulsecrm_starter_seat_monthly',
  },
  [Plan.GROWTH]: {
    key: Plan.GROWTH,
    name: 'Growth',
    description: 'For growing teams that need more room and visibility.',
    pricePerSeatCents: 5900,
    currency: 'usd',
    seatLimit: 20,
    contactLimit: 10_000,
    stripePriceEnvVar: 'STRIPE_PRICE_GROWTH',
    stripeLookupKey: 'pulsecrm_growth_seat_monthly',
  },
  [Plan.SCALE]: {
    key: Plan.SCALE,
    name: 'Scale',
    description: 'For larger teams that need the highest limits.',
    pricePerSeatCents: 9900,
    currency: 'usd',
    seatLimit: 100,
    contactLimit: 100_000,
    stripePriceEnvVar: 'STRIPE_PRICE_SCALE',
    stripeLookupKey: 'pulsecrm_scale_seat_monthly',
  },
};
