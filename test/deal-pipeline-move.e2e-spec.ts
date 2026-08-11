import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { cleanupOrganization } from './utils/cleanup-organization';
import { createTestApp } from './utils/create-test-app';

interface PipelineStage {
  id: string;
  name: string;
  order: number;
  isWon: boolean;
  isLost: boolean;
}

describe('Moving a deal through the pipeline (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();
  let organizationId: string;
  let accessToken: string;
  let contactId: string;
  let stages: PipelineStage[];

  beforeAll(async () => {
    app = await createTestApp();

    const signup = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        organizationName: 'E2E Pipeline Move Org',
        email: `e2e-pipeline-move-${Date.now()}@example.com`,
        password: 'Password123!',
        firstName: 'E2E',
        lastName: 'Admin',
      })
      .expect(201);

    accessToken = signup.body.accessToken as string;
    organizationId = signup.body.user.organizationId as string;

    const contact = await request(app.getHttpServer())
      .post('/api/v1/contacts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ firstName: 'Jane', lastName: 'Doe' })
      .expect(201);
    contactId = contact.body.id as string;

    const stagesResponse = await request(app.getHttpServer())
      .get('/api/v1/deals/pipeline-stages')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    stages = stagesResponse.body as PipelineStage[];
  });

  afterAll(async () => {
    await cleanupOrganization(prisma, organizationId);
    await prisma.$disconnect();
    await app.close();
  });

  function stageNamed(name: string): PipelineStage {
    const stage = stages.find((s) => s.name === name);
    if (!stage) throw new Error(`Fixture stage "${name}" not found`);
    return stage;
  }

  it('moves a deal between open stages, keeping it OPEN', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/deals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Pipeline deal', value: 5000, contactId })
      .expect(201);
    const dealId = created.body.id as string;
    expect(created.body.pipelineStageId).toBe(stageNamed('Lead').id);

    const moved = await request(app.getHttpServer())
      .patch(`/api/v1/deals/${dealId}/stage`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pipelineStageId: stageNamed('Contacted').id })
      .expect(200);

    expect(moved.body).toMatchObject({
      id: dealId,
      pipelineStageId: stageNamed('Contacted').id,
      status: 'OPEN',
    });
    expect(moved.body.closedAt).toBeNull();
  });

  it('marks a deal WON with closedAt set when moved into the Won stage', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/deals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Deal to win', value: 8000, contactId })
      .expect(201);
    const dealId = created.body.id as string;

    const won = await request(app.getHttpServer())
      .patch(`/api/v1/deals/${dealId}/stage`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pipelineStageId: stageNamed('Won').id })
      .expect(200);

    expect(won.body).toMatchObject({
      id: dealId,
      pipelineStageId: stageNamed('Won').id,
      status: 'WON',
    });
    expect(won.body.closedAt).toEqual(expect.any(String));
  });

  it('marks a deal LOST when moved into the Lost stage', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/deals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Deal to lose', value: 2000, contactId })
      .expect(201);
    const dealId = created.body.id as string;

    const lost = await request(app.getHttpServer())
      .patch(`/api/v1/deals/${dealId}/stage`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pipelineStageId: stageNamed('Lost').id })
      .expect(200);

    expect(lost.body).toMatchObject({
      id: dealId,
      pipelineStageId: stageNamed('Lost').id,
      status: 'LOST',
    });
    expect(lost.body.closedAt).toEqual(expect.any(String));
  });

  it('rejects moving a deal to a pipeline stage outside the organization (404)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/deals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Deal for bad stage', value: 3000, contactId })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/deals/${created.body.id as string}/stage`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pipelineStageId: 'not-a-real-stage' })
      .expect(404);
  });
});
