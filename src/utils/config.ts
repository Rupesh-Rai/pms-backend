import dotenv from 'dotenv';

dotenv.config();

export interface IServerConfig {
  port: number;
  db_config: {
    db: string;
    username: string;
    password: string;
    host: string;
    port: number;
    dbname: string;
  };
}

export const config: IServerConfig = {
  port: Number(process.env.PORT) || 3000,
  db_config: {
    db: process.env.DB_TYPE || 'postgres',
    username: process.env.DB_USERNAME || '',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    dbname: process.env.DB_NAME || 'pms',
  },
};