import express from 'express';
import type { Server } from 'node:http';
import { config, type IServerConfig } from '@/utils/config';
import { Routes } from '@/routes/index';

export class ExpressServer {
  private static server: Server | null = null;
  public server_config: IServerConfig = config;

  constructor() {
    const port = this.server_config.port ?? 3000;

    // Initialize express app
    const app = express();

    // Use built-in Express body parsers
    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());

    app.get('/ping', (req, res) => {
      res.send('pong');
    });

    const routes = new Routes(app);

    if (routes) {
      console.log('Server Routes started for server');
    } else {
      console.error('Error occurred while starting server routes');
    }

    // Start HTTP server only if not already running
    if (!ExpressServer.server) {
      ExpressServer.server = app.listen(port, () => {
        console.log(
          `Server is running on port ${port} with PID = ${process.pid}`
        );
      });
    }
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