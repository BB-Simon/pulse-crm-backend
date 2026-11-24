## Project

**PulseCRM** is a multi-tenant SaaS CRM for small agencies and freelance consulting teams (2–20 people). It is a focused alternative to Pipedrive/HubSpot. Organizations sign up, pick a Stripe plan, and pay per seat.

- **Problem:** small teams either track leads in scattered spreadsheets and email (follow-ups get missed, nobody sees the whole picture) or pay for enterprise CRMs that are too big and too expensive for them.
- **Solution:** contacts, companies, deals and activities live in one place, with a visual Kanban pipeline. Claude handles busywork: lead scoring, deal summaries and follow-up email drafts. Dashboards and team analytics show managers how the pipeline and each rep are doing. The scope stays at core CRM workflows only.
- **Target user:** an agency owner or sales manager whose reps log activity, move deals and get follow-up reminders.

This repo is the **backend only**. The frontend is a separate React app: Vite, TypeScript, TanStack Query, Zustand, React Hook Form + Zod, Tailwind + shadcn/ui, dnd-kit, Recharts, Axios and React Router. It is deployed to Vercel. The backend is deployed to Railway/Render.

## Tech stack

NestJS 11 (modular monolith) · TypeScript · PostgreSQL + Prisma 6 · JWT auth (access + refresh) · BullMQ + Redis · Socket.io gateway · @nestjs/schedule (cron) · Swagger · Stripe (Checkout, Billing Portal, webhooks) · Resend (email) · Anthropic SDK (Claude) · Jest + Supertest · Docker · GitHub Actions.

## Commands

```bash
docker compose up -d            # Postgres (host port 5433) + Redis (6379) for local dev
cp .env.example .env            # then fill in secrets
npx prisma generate             # needed after install and after any schema change
npx prisma migrate dev --name <change>   # create and apply a migration
npm run start:dev               # watch mode (PORT from .env; main.ts falls back to 5000)
npm run build                   # nest build -> dist/
npm run lint                    # eslint --fix (CI runs `npm run lint:ci`, which does not fix)
npm test                        # unit tests: src/**/*.spec.ts
npx jest src/modules/deals/deals.service.spec.ts      # a single unit test file
npx jest -t "moves a deal"                            # tests matching a name
npm run test:e2e                # test/*.e2e-spec.ts (needs real Postgres + Redis, runs in band)
npx jest --config ./test/jest-e2e.json --runInBand test/deal-creation.e2e-spec.ts   # a single e2e file
npm run stripe:setup-plans      # creates the Stripe prices; copy the IDs into STRIPE_PRICE_*
npm run notifications:test-enqueue   # pushes a test job onto the notifications queue
```

Swagger docs: `/api/docs` (internal JWT API) and `/public/docs` (public API-key API).
Local Stripe webhooks: `stripe listen --forward-to localhost:3000/api/v1/billing/webhook`.

CI (`.github/workflows/ci.yml`) runs on PRs and pushes to `main`. It runs lint, unit tests, e2e tests against Postgres/Redis service containers, the build, and a Docker build. The Docker image runs `prisma migrate deploy` on startup (`docker-entrypoint.sh`).

## Folder structure

```
prisma/schema.prisma, migrations/   # DB schema; models/fields are @map'd to snake_case tables/columns
scripts/                             # one-off ts-node scripts (Stripe plan setup, queue test)
src/main.ts                          # bootstrap: CORS, two Swagger documents
src/app.setup.ts                     # global prefix, ValidationPipe, exception filter (shared with e2e)
src/app.module.ts                    # wires all modules + the ReadOnlyModeMiddleware
src/common/                          # guards, decorators, filters, middleware, OrgMembershipService, pagination DTOs
src/modules/<feature>/               # controller + service + dto/ per feature
test/                                # e2e specs; utils/create-test-app.ts boots the real AppModule
```

Feature modules: auth, organizations (invites), users, companies, contacts (CSV import, lead scoring), deals (pipeline stages, AI summary and follow-up draft), activities, tasks (overdue cron), dashboard, analytics, search, calendar, notifications, mail, billing, api-keys, public-api, webhooks, realtime, ai, queue, prisma.

## Architecture: what you need to know

- **Multi-tenancy is enforced manually.** Every tenant-owned row has an `organizationId`. Services must filter every query by `user.organizationId`, which comes from the JWT through `@CurrentUser()`. There is no automatic Prisma middleware doing this. When a request references another record (company, owner, stage), check that it belongs to the same org. Use `OrgMembershipService` or the service's own `assert…InOrg` helpers.
- **Roles:** `ADMIN | MANAGER | REP`, applied with `@Roles()` + `RolesGuard`. When a record is created or reassigned, `OrgMembershipService.resolveOwnerId` makes a Rep the owner. Managers and Admins can assign any teammate in the org.
- **Two API surfaces:**
  - `/api/v1/*`: user JWT through `JwtAuthGuard`. The global prefix is set in `app.setup.ts`.
  - `/public/v1/*`: `X-API-Key` through `ApiKeyGuard` + `ApiKeyThrottlerGuard` (100 requests/min per key). `@CurrentApiKeyOrg()` gives the org. This surface has no per-user roles. It is excluded from the global prefix, so its controllers declare the full path themselves. It gets its own Swagger document, built only from `PublicApiModule`.
- **Billing gating:**
  - `plan-catalog.ts` sets the price, seat limit and contact limit for each plan (`STARTER`, `GROWTH`, `SCALE`).
  - `@EnforcePlanLimit(resource)` + `PlanLimitsGuard` block a create once the org is at its limit.
  - `ReadOnlyModeMiddleware` decodes the JWT itself and rejects non-GET requests when the subscription is `PAST_DUE` or `CANCELED`. `auth/*` and `billing/*` stay reachable.
  - Stripe webhooks keep subscription status in sync. `rawBody: true` in `main.ts` is needed for webhook signature checks.
- **Async work** uses BullMQ. `QueueModule` is global and holds the Redis connection, and each feature registers its own queue:
  - `notifications`: `NotificationsProcessor` sends email through `MailService` and creates in-app notifications. It runs in the API process, not as a separate service.
  - `webhook-delivery`: outbound webhooks with HMAC signing (`webhook-signing.util.ts`), retries with backoff, and `WebhookDelivery` records.
- **Realtime:** `RealtimeGateway` (Socket.io) authenticates the handshake with the same JWT (`auth.token`) and puts each socket in the `org:<id>` room. Domain events such as `deal.stage_changed` are broadcast to that room.
- **AI:** `AiModule` provides the `ANTHROPIC_CLIENT` token. The model comes from `ANTHROPIC_MODEL`. Consumers check `ANTHROPIC_API_KEY` themselves: `LeadScoringService`, `DealSummaryService` and `FollowUpDraftService`.
- **Optional integrations degrade gracefully.** Without Stripe, Resend or Anthropic keys the app still runs. Without Resend, `MailService` logs emails instead of sending them.
- **Cron:** `TasksOverdueCron` runs every 5 minutes. It marks overdue tasks with `overdueNotifiedAt` and enqueues notifications.
- **Validation:** the global `ValidationPipe` uses `whitelist` + `forbidNonWhitelisted` + `transform`, so any DTO field without a class-validator decorator is rejected. List endpoints extend `PaginationQueryDto` and return `PaginationMetaDto`.
- **E2E tests** boot the full `AppModule` with `configureApp()` against real Postgres and Redis. Use `test/utils/cleanup-organization.ts` to tear down the data a test creates. E2E files must run with `--runInBand`.
