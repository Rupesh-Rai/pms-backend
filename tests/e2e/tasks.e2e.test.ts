// tests/e2e/tasks.e2e.test.ts
import request from 'supertest';
import { Application } from 'express';
import { createTestApp } from '../helpers/test_app';
import { createTestAdmin } from '../helpers/test_user';
import { DatabaseUtil } from '@/utils/db';
import { redis } from '@/utils/redis';

describe('Tasks Controller E2E Tests (Supertest)', () => {
  let app: Application;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    const testAdmin = await createTestAdmin();
    adminToken = testAdmin.token;
  });

  afterAll(async () => {
    // 1. Close Redis connection
    if (redis.status === 'ready') {
      await redis.quit();
    }

    // 2. Clear test tables & close DB connection
    const dbUtil = await DatabaseUtil.getInstance();
    if (dbUtil.isInitialized) {
      await dbUtil.dataSource?.dropDatabase(); // Safe optional chaining call
      await dbUtil.destroy();
    }
  });

  describe('GET /ping', () => {
    it('should return 200 OK with pong without auth', async () => {
      const response = await request(app).get('/ping').expect(200);
      expect(response.text).toBe('pong');
    });
  });

  describe('GET /api/tasks', () => {
    it('should return 401 when Authorization header is missing', async () => {
      await request(app).get('/api/tasks').expect(401);
    });

    it('should return status 200 and formatted tasks array with valid token', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should return 404 when updating a non-existent task', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .put(`/api/tasks/${nonExistentUuid}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Non-existent Task' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body.message).toBe('Task not found');
    });
  });
});
