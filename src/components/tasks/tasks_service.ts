import { Repository, In } from 'typeorm';
import { BaseService, ApiResponse } from '@/utils/base_service';
import { DatabaseUtil } from '@/utils/db';
import { Tasks } from './tasks_entity';
import { Files } from '@/components/files/files_entity';

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
    // Extract all file IDs across tasks
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

    await this.repository.update(taskId, {
      supported_files: updatedFiles,
      updated_at: new Date(),
    });

    return await this.update(taskId, { supported_files: updatedFiles });
  }

  public override async update(
    id: string,
    updatePayload: Record<string, any>
  ): Promise<ApiResponse<Tasks>> {
    await this.repository.update(id, updatePayload);
    const populatedResult = await this.findByIds([id]);

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
