import { DataSource } from 'typeorm';
import { config, type IServerConfig } from '@/utils/config';

export class DatabaseUtil {
  public server_config: IServerConfig = config;
  public static AppDataSource: DataSource;

  constructor() {
    this.connectDatabase();
  }

  private connectDatabase() {
    try {
      const db_config = this.server_config.db_config;

      DatabaseUtil.AppDataSource = new DataSource({
        type: 'postgres',
        host: db_config.host,
        port: db_config.port,
        username: db_config.username,
        password: db_config.password,
        database: db_config.dbname,
        entities: [],
        synchronize: true,
        logging: false,
      });

      DatabaseUtil.AppDataSource.initialize()
        .then(() => {
          console.log('Database connection established successfully.');
        })
        .catch((error) => {
          console.error('Error during database connection initialization:', error);
        });
    } catch (error) {
      console.error('Error during database configuration parsing:', error);
    }
  }
}