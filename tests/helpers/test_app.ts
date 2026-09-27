// tests/helpers/test_app.ts
import { Application } from 'express';
import { ExpressServer } from '@/express_server';
import { DatabaseUtil } from '@/utils/db';
import { redis } from '@/utils/redis';

export async function createTestApp(): Promise<Application> {
  // 1. Ensure DB Connection & Sync Schema
  const dbUtil = await DatabaseUtil.getInstance();

  if (dbUtil.dataSource && dbUtil.dataSource.isInitialized) {
    // Recreates missing tables cleanly for the test run
    await dbUtil.dataSource.synchronize(true);
  }

  // 2. Ensure Redis Connection
  if (redis.status !== 'ready') {
    await redis.connect();
  }

  // 3. Return un-listened Express app
  const serverInstance = new ExpressServer();
  return serverInstance.app;
}
