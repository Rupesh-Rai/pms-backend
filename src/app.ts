import { ExpressServer } from '@/express_server';
import { DatabaseUtil } from '@/utils/db';
import { DDLUtil } from '@/utils/ddl_util';

const args = process.argv.slice(2);

async function bootstrap() {
  try {
    // 1. Initialize and connect to the database via Singleton FIRST
    await DatabaseUtil.getInstance();

    // 2. Check for the --init command line flag to run database setup tasks
    if (args.length > 0 && args[0] === '--init') {
      console.log('Running system DDL initialization...');
      await DDLUtil.addDefaultRole();
      await DDLUtil.addDefaultUser();
      console.log('Initialization completed. Exiting process.');
      process.exit(0);
    }

    // 3. Instantiate server ONLY after DB connection is ready (normal server flow)
    const server = new ExpressServer();

    // Handle unexpected runtime errors gracefully
    process.on('uncaughtException', (error: Error) => {
      console.error(`Uncaught exception in process ${process.pid}:`, error);
      server.closeServer();
    });

    // Handle termination signals (e.g., Ctrl+C or kill commands)
    process.on('SIGINT', () => {
      console.log('Received SIGINT signal. Shutting down...');
      server.closeServer();
    });

    process.on('SIGTERM', () => {
      console.log('Received SIGTERM signal. Shutting down...');
      server.closeServer();
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
