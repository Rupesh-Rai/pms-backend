import { TasksService } from '@/components/tasks/tasks_service';
import { DatabaseUtil } from '@/utils/db';
import { Files } from '@/components/files/files_entity';
import { CacheService } from '@/utils/redis';
import { CacheKeys, CacheTTL } from '@/utils/cache_utils';

jest.mock('@/utils/db', () => ({
  DatabaseUtil: {
    getInstance: jest.fn(),
  },
}));

jest.mock('@/utils/redis', () => ({
  CacheService: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

describe('TasksService Unit Tests', () => {
  let mockTaskRepo: any;
  let mockFileRepo: any;
  let mockQueryBuilder: any;
  let service: TasksService;

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    mockTaskRepo = {
      metadata: {
        primaryColumns: [{ propertyName: 'task_id' }],
        columns: [{ propertyName: 'task_id' }, { propertyName: 'name' }],
      },

      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),

      find: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockFileRepo = {
      find: jest.fn(),
    };

    (DatabaseUtil.getInstance as jest.Mock).mockResolvedValue({
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === Files) {
          return mockFileRepo;
        }

        return mockTaskRepo;
      }),
    });

    service = await TasksService.createInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------
  // getTasksByProjectId
  // ---------------------------------------------------------

  describe('getTasksByProjectId', () => {
    it('should return cached tasks if available in Redis', async () => {
      const cachedData = [
        {
          task_id: 'task_1',
          name: 'Cached Task',
        },
      ];

      (CacheService.get as jest.Mock).mockResolvedValue(cachedData);

      const result = await service.getTasksByProjectId('proj_100');

      // Should check Redis
      expect(CacheService.get).toHaveBeenCalledWith(
        CacheKeys.projects.tasks('proj_100')
      );

      // Should NOT query the database
      expect(mockTaskRepo.createQueryBuilder).not.toHaveBeenCalled();

      // Should return cached data
      expect(result).toEqual(cachedData);
    });

    it('should query DB and set Redis cache on cache miss', async () => {
      const rawTasksFromDb = [
        {
          task_id: 'task_1',
          name: 'DB Task',
          supported_files: ['file_1'],
          project: {
            project_id: 'proj_100',
          },
          user: {
            user_id: 'usr_1',
          },
        },
      ];

      const mockFiles = [
        {
          file_id: 'file_1',
          filename: 'design.pdf',
        },
      ];

      // Redis cache miss
      (CacheService.get as jest.Mock).mockResolvedValue(null);

      // Database returns tasks
      mockQueryBuilder.getMany.mockResolvedValue(rawTasksFromDb);

      // File repository returns supported files
      mockFileRepo.find.mockResolvedValue(mockFiles);

      const result = await service.getTasksByProjectId('proj_100');

      // ---------------------------------------------------
      // Verify QueryBuilder was used
      // ---------------------------------------------------

      expect(mockTaskRepo.createQueryBuilder).toHaveBeenCalledWith('task');

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'task.project',
        'project'
      );

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'task.user',
        'user'
      );

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'task.project_id = :projectId',
        {
          projectId: 'proj_100',
        }
      );

      expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1);

      // ---------------------------------------------------
      // Verify files were fetched
      // ---------------------------------------------------

      expect(mockFileRepo.find).toHaveBeenCalledTimes(1);

      // ---------------------------------------------------
      // Verify Redis cache was populated
      // ---------------------------------------------------

      expect(CacheService.set).toHaveBeenCalledWith(
        CacheKeys.projects.tasks('proj_100'),
        result,
        CacheTTL.PROJECT_TASKS
      );

      // ---------------------------------------------------
      // Verify formatted result
      // ---------------------------------------------------

      expect(result[0]).toEqual({
        task_id: 'task_1',
        name: 'DB Task',
        supported_files: ['file_1'],

        projectDetails: {
          project_id: 'proj_100',
        },

        userDetails: {
          user_id: 'usr_1',
        },

        fileDetails: [mockFiles[0]],
      });
    });
  });

  // ---------------------------------------------------------
  // createTask
  // ---------------------------------------------------------

  describe('createTask', () => {
    it('should save task and invalidate parent project cache keys', async () => {
      const taskInput = {
        name: 'New Feature',
        project_id: 'proj_200',
        user_id: 'usr_1',
      };

      const savedTask = {
        task_id: 'task_2',
        ...taskInput,
      };

      mockTaskRepo.create.mockReturnValue(taskInput);
      mockTaskRepo.save.mockResolvedValue(savedTask);

      const result = await service.createTask(taskInput as any);

      expect(mockTaskRepo.create).toHaveBeenCalledWith(taskInput);

      expect(mockTaskRepo.save).toHaveBeenCalledWith(taskInput);

      // Verify related caches are invalidated
      expect(CacheService.del).toHaveBeenCalledWith(
        CacheKeys.projects.tasks('proj_200'),
        CacheKeys.projects.stats('proj_200')
      );

      expect(result).toEqual(savedTask);
    });
  });

  // ---------------------------------------------------------
  // findAll
  // ---------------------------------------------------------

  describe('findAll', () => {
    it('should build filtered query and return formatted tasks', async () => {
      const mockQueryReturn = [
        {
          task_id: 'task_3',
          name: 'Task 3',
          supported_files: [],

          project: {
            project_id: 'proj_1',
            name: 'Project Alpha',
          },

          user: {
            user_id: 'usr_1',
            username: 'rupesh',
          },
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockQueryReturn);

      const queryParams = {
        username: 'rupesh',
        project_id: 'proj_1',
      };

      const result = await service.findAll(queryParams);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.username ILIKE :userName',
        {
          userName: '%rupesh%',
        }
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.project_id = :projectId',
        {
          projectId: 'proj_1',
        }
      );

      expect(result).toEqual({
        statusCode: 200,
        status: 'success',
        data: [
          {
            task_id: 'task_3',
            name: 'Task 3',
            supported_files: [],

            projectDetails: {
              project_id: 'proj_1',
              name: 'Project Alpha',
            },

            userDetails: {
              user_id: 'usr_1',
              username: 'rupesh',
            },

            fileDetails: [],
          },
        ],
      });
    });
  });
});
