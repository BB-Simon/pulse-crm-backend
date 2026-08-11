import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';

/**
 * Boots the real AppModule against the configured dev Postgres/Redis
 * instance, with the same prefixing/validation/error-handling pipeline as
 * production (see src/app.setup.ts) — not a bare, unconfigured Nest app.
 *
 * Each call opens real BullMQ/Redis connections and schedules cron jobs
 * (ScheduleModule), so e2e spec files run one at a time (`test:e2e` uses
 * --runInBand) — running them in parallel workers races their teardown and
 * intermittently force-exits a worker.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}
