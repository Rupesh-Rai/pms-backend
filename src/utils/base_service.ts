import {
  Repository,
  DeepPartial,
  FindOneOptions,
  ObjectLiteral,
  FindOptionsWhere,
} from 'typeorm';

export type UpdateDataKeys<T> = keyof T & keyof DeepPartial<T>;

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T | null;
  statusCode: number;
}

export class BaseService<T extends ObjectLiteral> {
  constructor(protected readonly repository: Repository<T>) {}

  /**
   * Creates a new entity using the provided data and saves it to the database.
   */
  async create(entityData: DeepPartial<T>): Promise<ApiResponse<T>> {
    try {
      const createdEntity = this.repository.create(entityData);
      const savedEntity = await this.repository.save(createdEntity);

      return { statusCode: 201, status: 'success', data: savedEntity };
    } catch (error: any) {
      if (error?.code === '23505') {
        return {
          statusCode: 409,
          status: 'error',
          message: error.detail || 'Unique constraint violation',
        };
      }
      return {
        statusCode: 500,
        status: 'error',
        message: error?.message || 'Internal server error',
      };
    }
  }

  /**
   * Updates an entity by its ID using the provided update data.
   */
  async update(
    id: string,
    updateData: DeepPartial<T>
  ): Promise<ApiResponse<T>> {
    try {
      const isExist = await this.findOne(id);
      if (isExist.statusCode === 404 || !isExist.data) {
        return isExist;
      }

      const primaryKey =
        this.repository.metadata.primaryColumns[0].propertyName;
      const validColumns = this.repository.metadata.columns.map(
        (col) => col.propertyName
      );

      const updateQuery: Record<string, any> = {};
      const keys = Object.keys(updateData) as UpdateDataKeys<T>[];

      for (const key of keys) {
        if (
          Object.prototype.hasOwnProperty.call(updateData, key) &&
          validColumns.includes(key as string)
        ) {
          updateQuery[key as string] = updateData[key];
        }
      }

      const result = await this.repository
        .createQueryBuilder()
        .update()
        .set(updateQuery)
        .where(`${primaryKey} = :id`, { id })
        .returning('*')
        .execute();

      if (result.affected && result.affected > 0) {
        return {
          statusCode: 200,
          status: 'success',
          data: result.raw[0] as T,
        };
      }

      return {
        statusCode: 400,
        status: 'error',
        data: null,
        message: 'Invalid Data or no changes applied',
      };
    } catch (error: any) {
      return {
        statusCode: 500,
        status: 'error',
        message: error?.message || 'Internal server error',
      };
    }
  }

  /**
   * Finds a single entity by its ID.
   */
  async findOne(id: string): Promise<ApiResponse<T>> {
    try {
      const primaryKey =
        this.repository.metadata.primaryColumns[0].propertyName;

      const options: FindOneOptions<T> = {
        where: { [primaryKey]: id } as FindOptionsWhere<T>,
      };

      const data = await this.repository.findOne(options);

      if (data) {
        return { statusCode: 200, status: 'success', data };
      }

      return { statusCode: 404, status: 'error', message: 'Not Found' };
    } catch (error: any) {
      return {
        statusCode: 500,
        status: 'error',
        message: error?.message || 'Internal server error',
      };
    }
  }

  /**
   * Finds all entities based on query parameters using safe parameterized bindings.
   */
  async findAll(queryParams: Record<string, any>): Promise<ApiResponse<T[]>> {
    try {
      let data: T[] = [];

      if (queryParams && Object.keys(queryParams).length > 0) {
        const query = this.repository.createQueryBuilder('entity');
        const validColumns = this.repository.metadata.columns.map(
          (col) => col.propertyName
        );

        for (const [field, value] of Object.entries(queryParams)) {
          if (validColumns.includes(field)) {
            query.andWhere(`entity.${field} = :${field}`, {
              [field]: value,
            });
          }
        }
        data = await query.getMany();
      } else {
        data = await this.repository.find();
      }

      return { statusCode: 200, status: 'success', data };
    } catch (error: any) {
      return {
        statusCode: 500,
        status: 'error',
        data: [],
        message: error?.message || 'Internal server error',
      };
    }
  }

  /**
   * Deletes an entity by its ID.
   */
  async delete(id: string): Promise<ApiResponse<T>> {
    try {
      const isExist = await this.findOne(id);
      if (isExist.statusCode === 404) {
        return isExist;
      }

      await this.repository.delete(id);

      return { statusCode: 200, status: 'success', data: null };
    } catch (error: any) {
      return {
        statusCode: 500,
        status: 'error',
        message: error?.message || 'Internal server error',
      };
    }
  }

  /**
   * Retrieves multiple records by an array of IDs.
   */
  async findByIds(ids: string[]): Promise<ApiResponse<T[]>> {
    try {
      if (!ids || ids.length === 0) {
        return { statusCode: 200, status: 'success', data: [] };
      }

      const primaryKey =
        this.repository.metadata.primaryColumns[0].propertyName;

      const data = await this.repository
        .createQueryBuilder('entity')
        .where(`entity.${primaryKey} IN (:...ids)`, { ids })
        .getMany();

      return { statusCode: 200, status: 'success', data };
    } catch (error: any) {
      return {
        statusCode: 500,
        status: 'error',
        data: [],
        message: error?.message || 'Internal server error',
      };
    }
  }

  /**
   * Executes a custom SQL WHERE condition safely.
   */
  async customQuery(
    whereClause: string,
    parameters?: Record<string, any>
  ): Promise<T[]> {
    try {
      return await this.repository
        .createQueryBuilder('entity')
        .where(whereClause, parameters)
        .getMany();
    } catch (error: any) {
      console.error(
        `Error executing custom query: ${whereClause}`,
        error?.message
      );
      return [];
    }
  }
}