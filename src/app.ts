import { ExpressServer } from '@/express_server';
import { DatabaseUtil } from '@/utils/db';
import { DDLUtil } from '@/utils/ddl_util';
import { redis, CacheService } from '@/utils/redis';
import { CacheKeys, CacheTTL } from '@/utils/cache_utils';
import { RolesService } from '@/components/roles/roles_service';
import { NotificationUtil } from '@/utils/notification_util';
import { QueueWorker } from '@/workers/queue_worker';

const args = process.argv.slice(2);

async function bootstrap() {
  try {
    // 1. Database Connection
    await DatabaseUtil.getInstance();

    // 2. DDL Init Check
    if (args.length > 0 && args[0] === '--init') {
      console.log('Running system DDL initialization...');
      await DDLUtil.addDefaultRole();
      await DDLUtil.addDefaultUser();
      console.log('Initialization completed. Exiting process.');
      process.exit(0);
    }

    // 3. Connect to Redis & Execute Proactive Cache Warm-up
    console.log('Connecting to Redis...');
    await redis.connect();

    console.log('Warming up proactive cache...');
    const rolesService = await RolesService.createInstance();
    const rolesResponse = await rolesService.findAll({});

    if (rolesResponse.data) {
      await CacheService.set(
        CacheKeys.roles.all,
        rolesResponse.data,
        CacheTTL.ROLES
      );
      console.log('Roles proactive cache populated successfully.');
    }

    // 4. Initialize Notification System & Queue Worker
    console.log('Initializing Notification System & Queue Worker...');
    NotificationUtil.init({
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || 'no-reply@yourdomain.com',
    });

    QueueWorker.init();
    QueueWorker.beginProcessing();

    // 5. Start Express Server
    const server = new ExpressServer();

    process.on('uncaughtException', (error: Error) => {
      console.error(`Uncaught exception in process ${process.pid}:`, error);
      redis.disconnect();
      server.closeServer();
    });

    process.on('SIGINT', async () => {
      console.log('Received SIGINT signal. Shutting down...');
      await redis.quit();
      server.closeServer();
    });

    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM signal. Shutting down...');
      await redis.quit();
      server.closeServer();
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
