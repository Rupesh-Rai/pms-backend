// integration_setup.ts
import { DatabaseUtil } from '@/utils/db';
import { redis } from '@/utils/redis';
import { Roles } from '@/components/roles/roles_entity';
import { Users } from '@/components/users/users_entity';
import { Projects } from '@/components/projects/projects_entity';
import { Tasks } from '@/components/tasks/tasks_entity';
import { Comments } from '@/components/comments/comments_entity';
import { Files } from '@/components/files/files_entity';

export const setupIntegrationTest = () => {
  beforeAll(async () => {
    await DatabaseUtil.getInstance();
    if (redis.status !== 'ready') {
      await redis.connect();
    }
  });

  beforeEach(async () => {
    // 1. Flush Redis safely
    if (redis.status === 'ready') {
      await redis.flushdb();
    }

    // 2. Truncate Postgres tables sequentially
    const dbUtil = await DatabaseUtil.getInstance();
    const entities = [Comments, Files, Tasks, Projects, Users, Roles];

    for (const entity of entities) {
      const repo = dbUtil.getRepository(entity);
      await repo.query(
        `TRUNCATE TABLE "${repo.metadata.tableName}" RESTART IDENTITY CASCADE;`
      );
    }
  });

  afterAll(async () => {
    const dbUtil = await DatabaseUtil.getInstance();
    await dbUtil.destroy();
    if (redis.status === 'ready') {
      await redis.quit();
    }
  });
};
