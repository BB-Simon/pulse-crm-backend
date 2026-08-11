import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { cleanupOrganization } from './utils/cleanup-organization';
import { createTestApp } from './utils/create-test-app';

describe('Auth signup (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = new PrismaClient();
  const createdOrgIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    for (const organizationId of createdOrgIds) {
      await cleanupOrganization(prisma, organizationId);
    }
    await prisma.$disconnect();
    await app.close();
  });

  it('signs up a new org + admin user, returning tokens and seeding default pipeline stages', async () => {
    const email = `e2e-signup-${Date.now()}@example.com`;

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        organizationName: 'E2E Signup Org',
        email,
        password: 'Password123!',
        firstName: 'E2E',
        lastName: 'Admin',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      user: {
        email,
        firstName: 'E2E',
        lastName: 'Admin',
        role: 'ADMIN',
        organizationId: expect.any(String),
      },
    });
    createdOrgIds.push(response.body.user.organizationId as string);

    const stagesResponse = await request(app.getHttpServer())
      .get('/api/v1/deals/pipeline-stages')
      .set('Authorization', `Bearer ${response.body.accessToken as string}`)
      .expect(200);

    expect(
      (stagesResponse.body as Array<{ name: string }>).map((s) => s.name),
    ).toEqual(['Lead', 'Contacted', 'Proposal', 'Won', 'Lost']);
  });

  it('rejects a second signup with the same email (409)', async () => {
    const email = `e2e-signup-dup-${Date.now()}@example.com`;
    const payload = {
      organizationName: 'E2E Dup Org',
      email,
      password: 'Password123!',
      firstName: 'Dup',
      lastName: 'User',
    };

    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send(payload)
      .expect(201);
    createdOrgIds.push(first.body.user.organizationId as string);

    await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send(payload)
      .expect(409);
  });

  it('rejects signup with missing required fields (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        organizationName: 'Incomplete Org',
        email: `e2e-incomplete-${Date.now()}@example.com`,
        // password, firstName, lastName omitted
      })
      .expect(400);
  });
});
