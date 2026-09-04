import { DataSource, Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { config, type IServerConfig } from '@/utils/config';
import { Roles } from '@/components/roles/roles_entity';
import { Users } from '@/components/users/users_entity';
import { Projects } from '@/components/projects/projects_entity';
import { Tasks } from '@/components/tasks/tasks_entity';
import { Comments } from '@/components/comments/comments_entity';

export class DatabaseUtil {
  private server_config: IServerConfig = config;
  private static connection: DataSource | null = null;
  private repositories: Map<string, Repository<any>> = new Map();
  private static instance: DatabaseUtil;

  // Private constructor prevents direct instantiation via `new`
  private constructor() {}

  /**
   * Returns the singleton instance of DatabaseUtil, initializing the connection if necessary.
   */
  public static async getInstance(): Promise<DatabaseUtil> {
    if (!DatabaseUtil.instance) {
      DatabaseUtil.instance = new DatabaseUtil();
      await DatabaseUtil.instance.connectDatabase();
    }
    return DatabaseUtil.instance;
  }

  /**
   * Establishes a connection using a PostgreSQL connection pool or returns the existing DataSource.
   */
  public async connectDatabase(): Promise<DataSource> {
    if (DatabaseUtil.connection && DatabaseUtil.connection.isInitialized) {
      return DatabaseUtil.connection;
    }

    try {
      const db_config = this.server_config.db_config;

      const AppSource = new DataSource({
        type: 'postgres',
        host: db_config.host,
        port: db_config.port,
        username: db_config.username,
        password: db_config.password,
        database: db_config.dbname,
        entities: [Roles, Users, Projects, Tasks, Comments],
        synchronize: false, // Set to true only in development; false in production
        logging: false,
        extra: {
          max: 10, // PostgreSQL connection pool size
          idleTimeoutMillis: 30000,
        },
      });

      DatabaseUtil.connection = await AppSource.initialize();
      console.log('Connected to the database with connection pool.');
      return DatabaseUtil.connection;
    } catch (error: any) {
      console.error('Error connecting to the database:', error?.message);
      throw error;
    }
  }

  /**
   * Retrieves and caches the TypeORM repository for a specified entity.
   */
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