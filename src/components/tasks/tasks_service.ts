import { Repository, In } from 'typeorm';
import { BaseService, ApiResponse } from '@/utils/base_service';
import { DatabaseUtil } from '@/utils/db';
import { Tasks } from './tasks_entity';
import { Files } from '@/components/files/files_entity';
import { CacheService } from '@/utils/redis';
import { CacheKeys, CacheTTL } from '@/utils/cache_utils';

export class TasksService extends BaseService<Tasks> {
  private fileRepository!: Repository<Files>;

  private constructor(
    repository: Repository<Tasks>,
    fileRepository: Repository<Files>
  ) {
    super(repository);
    this.fileRepository = fileRepository;
  }

  public static async createInstance(): Promise<TasksService> {
    const dbUtil = await DatabaseUtil.getInstance();
    const repository = dbUtil.getRepository(Tasks);
    const fileRepository = dbUtil.getRepository(Files);
    return new TasksService(repository, fileRepository);
  }

  private async formatTaskPayload(tasks: any[]) {
    const allFileIds = tasks.flatMap((task) => task.supported_files || []);

    let filesMap: Record<string, Files> = {};
    if (allFileIds.length > 0) {
      const files = await this.fileRepository.find({
        where: { file_id: In(allFileIds) },
      });
      filesMap = files.reduce(
        (acc, file) => {
          acc[file.file_id] = file;
          return acc;
        },
        {} as Record<string, Files>
      );
    }

    return tasks.map((item) => {
      const formattedItem = { ...item };

      formattedItem.projectDetails = item.project;
      formattedItem.userDetails = item.user;
      formattedItem.fileDetails = (item.supported_files || [])
        .map((fileId: string) => filesMap[fileId])
        .filter(Boolean);

      delete formattedItem.project;
      delete formattedItem.user;

      return formattedItem;
    });
  }

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
    const formattedData = await this.formatTaskPayload(data);

    return {
      statusCode: 200,
      status: 'success' as const,
      data: formattedData,
    };
  }

  public override async findByIds(
    ids: string[]
  ): Promise<ApiResponse<Tasks[]>> {
    // Return 200 status with empty array if no IDs provided
    if (!ids || ids.length === 0) {
      return {
        statusCode: 200,
        status: 'success' as const,
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

    const formattedData = await this.formatTaskPayload(tasks);

    return {
      statusCode: 200,
      status: 'success' as const,
      data: formattedData,
    };
  }

  public async attachFileToTask(
    taskId: string,
    fileId: string
  ): Promise<ApiResponse<Tasks>> {
    const taskResult = await this.findByIds([taskId]);
    if (!taskResult.data || taskResult.data.length === 0) {
      return {
        statusCode: 404,
        status: 'error' as const,
        message: 'Task not found',
      } as any;
    }

    const task = taskResult.data[0];
    const updatedFiles = Array.from(
      new Set([...(task.supported_files || []), fileId])
    );

    return await this.update(taskId, { supported_files: updatedFiles });
  }

  /**
   * WRITE: Update task and invalidate parent project task list & stats
   */
  public override async update(
    id: string,
    updatePayload: Record<string, any>
  ): Promise<ApiResponse<Tasks>> {
    // 1. Fetch existing task
    const existingTask = await this.repository.findOne({
      where: { task_id: id } as any,
      relations: { project: true },
    });

    // Guard clause: Return 404 if record doesn't exist
    if (!existingTask) {
      return {
        statusCode: 404,
        status: 'error' as const,
        message: 'Task not found',
      } as any;
    }

    // 2. Perform DB update
    await this.repository.update(id, updatePayload);
    const populatedResult = await this.findByIds([id]);

    const singleTask =
      populatedResult.data && populatedResult.data.length > 0
        ? (populatedResult.data[0] as unknown as Tasks)
        : null;

    // 3. Invalidate Redis cache
    const projectId =
      existingTask?.project?.project_id || (existingTask as any)?.project_id;

    if (projectId) {
      await CacheService.del(
        CacheKeys.projects.tasks(String(projectId)),
        CacheKeys.projects.stats(String(projectId))
      );
    }

    return {
      statusCode: 200,
      status: 'success' as const,
      data: singleTask as Tasks,
    };
  }

  /**
   * WRITE: Delete task and invalidate parent project task list & stats
   */
  public override async delete(id: string): Promise<ApiResponse<Tasks>> {
    // 1. Fetch task using object-based relations syntax
    const existingTask = await this.repository.findOne({
      where: { task_id: id } as any,
      relations: { project: true },
    });

    // 2. Delegate database removal to BaseService
    const response = await super.delete(id);

    // 3. Invalidate Redis cache on success
    if (response.statusCode === 200) {
      const projectId =
        existingTask?.project?.project_id || (existingTask as any)?.project_id;

      if (projectId) {
        await CacheService.del(
          CacheKeys.projects.tasks(String(projectId)),
          CacheKeys.projects.stats(String(projectId))
        );
      }
    }

    return response;
  }

  /**
   * READ: Cache-Aside strategy for fetching tasks by Project ID
   */
  public async getTasksByProjectId(
    projectId: string | number
  ): Promise<Tasks[]> {
    const cleanProjectId = String(projectId);
    const cacheKey = CacheKeys.projects.tasks(cleanProjectId);

    // 1. Check Redis Cache
    const cachedTasks = await CacheService.get<Tasks[]>(cacheKey);
    if (cachedTasks !== null) {
      return cachedTasks;
    }

    // 2. Query DB
    const tasks = await this.repository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.user', 'user')
      .where('task.project_id = :projectId', { projectId: cleanProjectId })
      .getMany();

    const formattedTasks = await this.formatTaskPayload(tasks);

    // 3. Cache the result in Redis
    await CacheService.set(cacheKey, formattedTasks, CacheTTL.PROJECT_TASKS);

    return formattedTasks;
  }

  /**
   * WRITE: Create task and invalidate parent project task list & stats
   */
  public async createTask(taskData: Partial<Tasks>): Promise<Tasks> {
    const taskEntity = this.repository.create(taskData);
    const savedTask = await this.repository.save(taskEntity);

    const projectId =
      (savedTask as any).project_id || (savedTask as any).project?.project_id;

    if (projectId) {
      await CacheService.del(
        CacheKeys.projects.tasks(projectId),
        CacheKeys.projects.stats(projectId)
      );
    }

    return savedTask;
  }
}
