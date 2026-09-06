import dotenv from 'dotenv';

dotenv.config();

export interface IServerConfig {
  port: number;
  db_config: {
    db: 'postgres' | 'mysql' | 'sqlite' | 'mariadb';
    username: string;
    password: string;
    host: string;
    port: number;
    dbname: string;
  };
  default_user: {
    email: string;
    password: string;
  };
}

export const config: IServerConfig = {
  port: Number(process.env.PORT) || 3000,
  db_config: {
    db: (process.env.DB_TYPE as IServerConfig['db_config']['db']) || 'postgres',
    username: process.env.DB_USERNAME || '',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    dbname: process.env.DB_NAME || 'pms',
  },
  default_user: {
    email: process.env.DEFAULT_USER_EMAIL || 'admin@admin.com',
    password: process.env.DEFAULT_USER_PASSWORD || 'Admin@123',
  },
};
