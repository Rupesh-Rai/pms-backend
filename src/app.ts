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

    // Graceful Shutdown Cleanup Handler
    const handleShutdown = async (signal: string) => {
      console.log(`Received ${signal}. Gracefully closing application...`);

      try {
        // Close BullMQ connections
        if (NotificationUtil.emailQueue) {
          await NotificationUtil.emailQueue.close();
        }
        if (QueueWorker['emailWorker']) {
          await QueueWorker['emailWorker'].close();
        }

        // Close ioredis connection
        await redis.quit();

        // Close Express Server
        server.closeServer();
        process.exit(0);
      } catch (err) {
        console.error('Error during graceful shutdown:', err);
        process.exit(1);
      }
    };

    process.on('uncaughtException', (error: Error) => {
      console.error(`Uncaught exception in process ${process.pid}:`, error);
      handleShutdown('uncaughtException');
    });

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
