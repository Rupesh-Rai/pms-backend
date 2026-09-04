import { ExpressServer } from '@/express_server';
import { DatabaseUtil } from '@/utils/db';

async function bootstrap() {
  try {
    // 1. Initialize and connect to the database via Singleton FIRST
    await DatabaseUtil.getInstance();

    // 2. Instantiate server ONLY after DB connection is ready
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
