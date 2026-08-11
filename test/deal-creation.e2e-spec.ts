import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { cleanupOrganization } from './utils/cleanup-organization';
import { createTestApp } from './utils/create-test-app';

describe('Deal creation (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();
  let organizationId: string;
  let accessToken: string;
  let contactId: string;

  beforeAll(async () => {
    app = await createTestApp();

    const signup = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        organizationName: 'E2E Deal Creation Org',
        email: `e2e-deal-creation-${Date.now()}@example.com`,
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
      .send({ firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' })
      .expect(201);
    contactId = contact.body.id as string;
  });

  afterAll(async () => {
    await cleanupOrganization(prisma, organizationId);
    await prisma.$disconnect();
    await app.close();
  });

  it('creates a deal defaulting to the organization’s first pipeline stage and OPEN status', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/deals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Acme annual contract', value: 15000, contactId })
      .expect(201);

    expect(response.body).toMatchObject({
      title: 'Acme annual contract',
      value: 15000,
      status: 'OPEN',
      contactId,
      organizationId,
    });
    expect(response.body.pipelineStageId).toEqual(expect.any(String));
    expect(response.body.closedAt).toBeNull();

    const getResponse = await request(app.getHttpServer())
      .get(`/api/v1/deals/${response.body.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(getResponse.body.id).toBe(response.body.id);
  });

  it('rejects a deal referencing a contact outside the organization (404)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/deals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Bad contact deal',
        value: 1000,
        contactId: 'not-a-real-contact',
      })
      .expect(404);
  });

  it('rejects a deal missing required fields (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/deals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ value: 1000, contactId })
      .expect(400);
  });

  it('rejects deal creation without authentication (401)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/deals')
      .send({ title: 'No auth deal', value: 1000, contactId })
      .expect(401);
  });
});
