import 'reflect-metadata';
import { ExpressServer } from '@/express_server';
import { DatabaseUtil } from '@/utils/db';

const server = new ExpressServer();

//connect the database
new DatabaseUtil();

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