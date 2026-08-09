/**
 * One-off provisioning script: creates (or reuses) the Stripe Products and
 * per-seat recurring Prices for every plan in the PulseCRM plan catalog.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup-plans
 *
 * Safe to re-run — it looks up existing Products/Prices by metadata/lookup
 * key before creating new ones. Prints the resulting Price ids so they can
 * be copied into .env (STRIPE_PRICE_STARTER / STRIPE_PRICE_GROWTH / STRIPE_PRICE_SCALE).
 */
import 'dotenv/config';
import Stripe from 'stripe';
import {
  PLAN_CATALOG,
  PLAN_ORDER,
  PlanDefinition,
} from '../src/modules/billing/plan-catalog';

async function findOrCreateProduct(
  stripe: Stripe,
  definition: PlanDefinition,
): Promise<Stripe.Product> {
  const existingProducts = await stripe.products.list({
    limit: 100,
    active: true,
  });
  const match = existingProducts.data.find(
    (product) => product.metadata.plan === definition.key,
  );
  if (match) {
    return match;
  }

  return stripe.products.create({
    name: `PulseCRM ${definition.name}`,
    description: definition.description,
    metadata: { plan: definition.key },
  });
}

async function findOrCreatePrice(
  stripe: Stripe,
  product: Stripe.Product,
  definition: PlanDefinition,
): Promise<Stripe.Price> {
  const existingPrices = await stripe.prices.list({
    lookup_keys: [definition.stripeLookupKey],
    limit: 1,
  });
  if (existingPrices.data[0]) {
    return existingPrices.data[0];
  }

  return stripe.prices.create({
    product: product.id,
    currency: definition.currency,
    unit_amount: definition.pricePerSeatCents,
    billing_scheme: 'per_unit',
    recurring: { interval: 'month', usage_type: 'licensed' },
    lookup_key: definition.stripeLookupKey,
    nickname: `${definition.name} — per seat / month`,
    metadata: { plan: definition.key },
  });
}

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Add it to your .env or pass it inline before running this script.',
    );
  }

  const stripe = new Stripe(secretKey);
  const results: Array<{ envVar: string; priceId: string }> = [];

  for (const plan of PLAN_ORDER) {
    const definition = PLAN_CATALOG[plan];

    const product = await findOrCreateProduct(stripe, definition);
    const price = await findOrCreatePrice(stripe, product, definition);

    console.log(
      `✔ ${definition.name}: product=${product.id} price=${price.id} (${definition.pricePerSeatCents / 100} ${definition.currency.toUpperCase()}/seat/mo)`,
    );
    results.push({ envVar: definition.stripePriceEnvVar, priceId: price.id });
  }

  console.log('\nAdd/update these in your .env:\n');
  for (const { envVar, priceId } of results) {
    console.log(`${envVar}=${priceId}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
