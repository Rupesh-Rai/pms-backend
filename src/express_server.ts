import express, { Express } from 'express';
import type { Server } from 'node:http';
import { config, type IServerConfig } from '@/utils/config';
import { Routes } from '@/routes/index';

export class ExpressServer {
  private static server: Server | null = null;
  public server_config: IServerConfig = config;
  public app: Express;

  constructor() {
    // Initialize express app
    this.app = express();

    // Use built-in Express body parsers
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(express.json());

    this.app.get('/ping', (req, res) => {
      res.send('pong');
    });

    const routes = new Routes(this.app);

    if (routes) {
      console.log('Server Routes started for server');
    } else {
      console.error('Error occurred while starting server routes');
    }
  }

  // Start HTTP server for production / dev startup
  public listen(): Server {
    const port = this.server_config.port ?? 3000;

    if (!ExpressServer.server) {
      ExpressServer.server = this.app.listen(port, () => {
        console.log(
          `Server is running on port ${port} with PID = ${process.pid}`
        );
      });
    }

    return ExpressServer.server;
  }

  // Gracefully close the server connections
  public closeServer(exitProcess = true): void {
    if (ExpressServer.server) {
      ExpressServer.server.close(() => {
        console.log('Server closed gracefully');
        if (exitProcess) process.exit(0);
      });
    } else if (exitProcess) {
      process.exit(0);
    }
  }
}
