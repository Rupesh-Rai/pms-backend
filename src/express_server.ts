import express, { type Application } from 'express';
import type { Server } from 'node:http';
import { config, type IServerConfig } from '@/utils/config';

export class ExpressServer {
  private static server: Server | null = null;
  public app: Application;
  public server_config: IServerConfig = config;

  constructor() {
    const port = this.server_config.port ?? 3000;

    // Initialize express app
    this.app = express();

    // Standard middleware
    this.app.use(express.json());

    // Health check route
    this.app.get('/ping', (_req, res) => {
      res.send('pong');
    });

    // Start http server
    ExpressServer.server = this.app.listen(port, () => {
      console.log(
        `Server is running on port ${port} with PID = ${process.pid}`
      );
    });
  }

  // Gracefully close the server connections and exit process
  public closeServer(): void {
    if (ExpressServer.server) {
      ExpressServer.server.close(() => {
        console.log('Server closed gracefully');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }
}