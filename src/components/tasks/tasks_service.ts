import { Repository } from 'typeorm';
import { BaseService } from '@/utils/base_service';
import { DatabaseUtil } from '@/utils/db';
import { Tasks } from './tasks_entity';
import { ApiResponse } from '@/utils/base_service';

export class TasksService extends BaseService<Tasks> {
  private constructor(repository: Repository<Tasks>) {
    super(repository);
  }

  public static async createInstance(): Promise<TasksService> {
    const dbUtil = await DatabaseUtil.getInstance();
    const repository = dbUtil.getRepository(Tasks);
    return new TasksService(repository);
  }

  /**
   * Helper method to map populated project and user relations into
   * projectDetails and userDetails objects across task entities.
   */
  private formatTaskPayload(tasks: any[]) {
    return tasks.map((item) => {
      const formattedItem = { ...item };

      formattedItem.projectDetails = item.project;
      formattedItem.userDetails = item.user;

      delete formattedItem.project;
      delete formattedItem.user;

      return formattedItem;
    });
  }

  /**
   * Overrides BaseService.findAll to return tasks with populated
   * projectDetails and userDetails.
   */
  public override async findAll(
    queryParams: Record<string, any> = {}
  ): Promise<ApiResponse<Tasks[]>> {
    const queryBuilder = this.repository
      .createQueryBuilder('task')
      .leftJoin('task.project', 'project')
      .leftJoin('task.user', 'user')
      .addSelect([
        'task',
        'project.project_id',
        'project.name',
        'user.user_id',
        'user.username',
        'user.email',
      ]);

    if (queryParams.username) {
      queryBuilder.andWhere('user.username ILIKE :userName', {
        userName: `%${queryParams.username}%`,
      });
    }

    if (queryParams.projectname) {
      queryBuilder.andWhere('project.name ILIKE :projectName', {
        projectName: `%${queryParams.projectname}%`,
      });
    }

    if (queryParams.project_id) {
      queryBuilder.andWhere('project.project_id = :projectId', {
        projectId: queryParams.project_id,
      });
    }

    const data = await queryBuilder.getMany();
    const formattedData = this.formatTaskPayload(data);

    return {
      statusCode: 200,
      status: 'success' as const,
      data: formattedData,
    };
  }

  /**
   * Overrides BaseService.findByIds to retrieve and populate a single task record by ID.
   */
  public override async findByIds(
    ids: string[]
  ): Promise<ApiResponse<Tasks[]>> {
    if (!ids || ids.length === 0) {
      return {
        statusCode: 400,
        status: 'error' as const,
        data: [],
      };
    }

    const tasks = await this.repository
      .createQueryBuilder('task')
      .leftJoin('task.project', 'project')
      .leftJoin('task.user', 'user')
      .addSelect([
        'task',
        'project.project_id',
        'project.name',
        'user.user_id',
        'user.username',
        'user.email',
      ])
      .where('task.task_id IN (:...ids)', { ids })
      .getMany();

    const formattedData = this.formatTaskPayload(tasks);

    return {
      statusCode: 200,
      status: 'success' as const,
      data: formattedData,
    };
  }

  /**
   * Overrides BaseService.update to update a task and return the populated record.
   */
  /**
   * Overrides BaseService.update to update a task and return the single populated record.
   */
  public override async update(
    id: string,
    updatePayload: Record<string, any>
  ): Promise<ApiResponse<Tasks>> {
    // 1. Perform database update
    await this.repository.update(id, updatePayload);

    // 2. Fetch the updated task with populated relations
    const populatedResult = await this.findByIds([id]);

    // 3. Unbox array to match single entity ApiResponse<Tasks> signature
    const singleTask =
      populatedResult.data && populatedResult.data.length > 0
        ? (populatedResult.data[0] as unknown as Tasks)
        : null;

    return {
      statusCode: populatedResult.statusCode,
      status: populatedResult.status,
      data: singleTask as Tasks,
    };
  }
}
