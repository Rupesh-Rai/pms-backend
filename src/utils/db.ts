// src/utils/db.ts
import { DataSource, Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { config, type IServerConfig } from '@/utils/config';
import { Roles } from '@/components/roles/roles_entity';
import { Users } from '@/components/users/users_entity';
import { Projects } from '@/components/projects/projects_entity';
import { Tasks } from '@/components/tasks/tasks_entity';
import { Comments } from '@/components/comments/comments_entity';
import { Files } from '@/components/files/files_entity';

export class DatabaseUtil {
  private server_config: IServerConfig = config;
  private static connection: DataSource | null = null;
  private static initPromise: Promise<DataSource> | null = null;
  private repositories: Map<string, Repository<any>> = new Map();
  private static instance: DatabaseUtil;

  private constructor() {}

  public static async getInstance(): Promise<DatabaseUtil> {
    if (!DatabaseUtil.instance) {
      DatabaseUtil.instance = new DatabaseUtil();
    }

    await DatabaseUtil.instance.connectDatabase();
    return DatabaseUtil.instance;
  }

  /**
   * Exposes the underlying TypeORM DataSource instance.
   */
  public get dataSource(): DataSource | null {
    return DatabaseUtil.connection;
  }

  public get isInitialized(): boolean {
    return DatabaseUtil.connection
      ? DatabaseUtil.connection.isInitialized
      : false;
  }

  public async connectDatabase(): Promise<DataSource> {
    if (DatabaseUtil.connection && DatabaseUtil.connection.isInitialized) {
      return DatabaseUtil.connection;
    }

    if (!DatabaseUtil.initPromise) {
      DatabaseUtil.initPromise = (async () => {
        try {
          const db_config = this.server_config.db_config;
          const isTestEnv = process.env.NODE_ENV === 'test';

          const AppSource = new DataSource({
            type: 'postgres',
            host: db_config.host,
            port: db_config.port,
            username: db_config.username,
            password: db_config.password,
            database: db_config.dbname,
            entities: [Roles, Users, Projects, Tasks, Comments, Files],
            // Synchronize automatically during test environment runs
            synchronize: isTestEnv ? true : false,
            logging: false,
            extra: {
              max: 10,
              idleTimeoutMillis: 30000,
            },
          });

          DatabaseUtil.connection = await AppSource.initialize();
          console.log('Connected to the database with connection pool.');
          return DatabaseUtil.connection;
        } catch (error: any) {
          DatabaseUtil.initPromise = null;
          console.error('Error connecting to the database:', error?.message);
          throw error;
        }
      })();
    }

    return DatabaseUtil.initPromise;
  }

  public async destroy(): Promise<void> {
    if (DatabaseUtil.connection && DatabaseUtil.connection.isInitialized) {
      await DatabaseUtil.connection.destroy();
      DatabaseUtil.connection = null;
      DatabaseUtil.initPromise = null;
      this.repositories.clear();
      console.log('Database connection pool successfully closed.');
    }
  }

  public getRepository<T extends ObjectLiteral>(
    entity: EntityTarget<T>
  ): Repository<T> {
    if (!DatabaseUtil.connection || !DatabaseUtil.connection.isInitialized) {
      throw new Error(
        'Database connection has not been initialized. Call getInstance() first.'
      );
    }

    const entityName =
      typeof entity === 'function' ? entity.name : String(entity);

    if (!this.repositories.has(entityName)) {
      const repo = DatabaseUtil.connection.getRepository(entity);
      this.repositories.set(entityName, repo);
    }

    return this.repositories.get(entityName) as Repository<T>;
  }
}
