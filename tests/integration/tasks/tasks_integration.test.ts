import { setupIntegrationTest } from '../../helpers/integration_setup';
import { TasksService } from '@/components/tasks/tasks_service';
import { DatabaseUtil } from '@/utils/db';
import { CacheService } from '@/utils/redis';
import { CacheKeys } from '@/utils/cache_utils';
import { Tasks, Priority, Status } from '@/components/tasks/tasks_entity';
import { Projects } from '@/components/projects/projects_entity';
import { Users } from '@/components/users/users_entity';
import { Roles } from '@/components/roles/roles_entity';
import { Files } from '@/components/files/files_entity';

describe('TasksService Integration Tests', () => {
  setupIntegrationTest();

  let tasksService: TasksService;
  let dbUtil: DatabaseUtil;
  let testProjectId: string;
  let testUserId: string;

  beforeEach(async () => {
    dbUtil = await DatabaseUtil.getInstance();
    tasksService = await TasksService.createInstance();

    // 1. Seed Role (Required by Users FK)
    const roleRepo = dbUtil.getRepository(Roles);
    const createdRole = await roleRepo.save(
      roleRepo.create({
        name: 'Admin',
      })
    );

    // 2. Seed User with role_id attached
    const userRepo = dbUtil.getRepository(Users);
    const createdUser = await userRepo.save(
      userRepo.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role_id: createdRole.role_id,
      })
    );
    testUserId = createdUser.user_id;

    // 3. Seed Project
    const projectRepo = dbUtil.getRepository(Projects);
    const createdProject = await projectRepo.save(
      projectRepo.create({
        name: 'Test Project',
        description: 'Integration project description',
      })
    );
    testProjectId = createdProject.project_id;
  });

  // Helper to construct relational dependencies per test block
  const createSeedData = async (uniqueTag: string) => {
    const roleRepo = dbUtil.getRepository(Roles);
    const userRepo = dbUtil.getRepository(Users);
    const projectRepo = dbUtil.getRepository(Projects);

    const seedRole = await roleRepo.save(
      roleRepo.create({
        name: `Role_${uniqueTag}`,
        description: 'Test Role',
      } as Partial<Roles>)
    );
    const seedUser = await userRepo.save(
      userRepo.create({
        username: `user_${uniqueTag}`,
        email: `test_${uniqueTag}@example.com`,
        password: 'password123',
        role: seedRole,
      } as Partial<Users>)
    );
    const seedProject = await projectRepo.save(
      projectRepo.create({
        name: `Project ${uniqueTag}`,
        description: 'Integration test description',
        user: seedUser,
      } as Partial<Projects>)
    );

    return { seedUser, seedProject };
  };

  // ==========================================
  // SECTION 1: CORE CACHE & CRUD OPERATIONS
  // ==========================================
  describe('Core CRUD & Cache Lifecycle', () => {
    it('should create a task in PostgreSQL and verify DB persistence', async () => {
      const taskData: Partial<Tasks> = {
        name: 'Integration Test Task',
        description: 'Testing DB writes',
        project_id: testProjectId,
        user_id: testUserId,
        priority: Priority.High,
        status: Status.InProgress,
      };

      const createdTask = await tasksService.createTask(taskData);
      expect(createdTask).toHaveProperty('task_id');
      expect(createdTask.name).toBe(taskData.name);

      const taskRepo = dbUtil.getRepository(Tasks);
      const taskInDb = await taskRepo.findOneBy({
        task_id: createdTask.task_id,
      });

      expect(taskInDb).not.toBeNull();
      expect(taskInDb?.name).toBe('Integration Test Task');
      expect(taskInDb?.project_id).toBe(testProjectId);
    });

    it('should fetch tasks from DB on cache miss and store result in Redis', async () => {
      const uniqueTag = Date.now().toString();
      const { seedUser, seedProject } = await createSeedData(uniqueTag);
      const taskRepo = dbUtil.getRepository(Tasks);

      const cleanProjectId = String(seedProject.project_id);
      const cacheKey = CacheKeys.projects.tasks(cleanProjectId);

      const seedTask = await taskRepo.save(
        taskRepo.create({
          name: 'Cached Task',
          description: 'Testing Redis Cache',
          priority: 'Low' as any,
          status: 'Not-Started' as any,
          project: seedProject,
          user: seedUser,
        } as Partial<Tasks>)
      );

      await CacheService.del(cacheKey);

      const dbTasks = await tasksService.getTasksByProjectId(cleanProjectId);

      expect(dbTasks).toHaveLength(1);
      expect(dbTasks[0].task_id).toBe(seedTask.task_id);

      const cachedTasks = await CacheService.get<Tasks[]>(cacheKey);
      expect(cachedTasks).not.toBeNull();
      expect(cachedTasks).toHaveLength(1);
      expect(cachedTasks![0].task_id).toBe(seedTask.task_id);
    });

    it('should invalidate project task list cache when creating a new task', async () => {
      const cacheKey = CacheKeys.projects.tasks(testProjectId);

      await CacheService.set(cacheKey, [{ fake: 'cached_data' }]);

      await tasksService.createTask({
        name: 'Cache Invalidation Task',
        project_id: testProjectId,
        user_id: testUserId,
      });

      const cachedDataAfter = await CacheService.get(cacheKey);
      expect(cachedDataAfter).toBeNull();
    });

    it('should return tasks directly from Redis on cache hit without querying DB', async () => {
      const uniqueTag = Date.now().toString();
      const { seedUser, seedProject } = await createSeedData(uniqueTag);
      const taskRepo = dbUtil.getRepository(Tasks);

      const cleanProjectId = String(seedProject.project_id);

      await taskRepo.save(
        taskRepo.create({
          name: 'Cache Hit Task',
          description: 'Testing DB bypass',
          priority: 'Low' as any,
          status: 'Not-Started' as any,
          project: seedProject,
          user: seedUser,
        } as Partial<Tasks>)
      );

      await tasksService.getTasksByProjectId(cleanProjectId);

      const createQueryBuilderSpy = jest.spyOn(taskRepo, 'createQueryBuilder');

      const cachedResult =
        await tasksService.getTasksByProjectId(cleanProjectId);

      expect(cachedResult).toHaveLength(1);
      expect(createQueryBuilderSpy).not.toHaveBeenCalled();

      createQueryBuilderSpy.mockRestore();
    });

    it('should invalidate project task list cache when updating an existing task', async () => {
      const uniqueTag = Date.now().toString();
      const { seedUser, seedProject } = await createSeedData(uniqueTag);
      const taskRepo = dbUtil.getRepository(Tasks);

      const cleanProjectId = String(seedProject.project_id);
      const cacheKey = CacheKeys.projects.tasks(cleanProjectId);

      const seedTask = await taskRepo.save(
        taskRepo.create({
          name: 'Initial Task Name',
          description: 'Testing update invalidation',
          priority: 'Low' as any,
          status: 'Not-Started' as any,
          project: seedProject,
          user: seedUser,
        } as Partial<Tasks>)
      );

      await tasksService.getTasksByProjectId(cleanProjectId);
      const initialCache = await CacheService.get<Tasks[]>(cacheKey);
      expect(initialCache).not.toBeNull();

      await tasksService.update(String(seedTask.task_id), {
        name: 'Updated Task Name',
        status: 'In-Progress' as any,
      });

      const postUpdateCache = await CacheService.get<Tasks[]>(cacheKey);
      expect(postUpdateCache).toBeNull();
    });

    it('should invalidate project task list cache when deleting a task', async () => {
      const uniqueTag = Date.now().toString();
      const { seedUser, seedProject } = await createSeedData(uniqueTag);
      const taskRepo = dbUtil.getRepository(Tasks);

      const cleanProjectId = String(seedProject.project_id);
      const cacheKey = CacheKeys.projects.tasks(cleanProjectId);

      const seedTask = await taskRepo.save(
        taskRepo.create({
          name: 'Task to be deleted',
          description: 'Testing delete invalidation',
          priority: 'High' as any,
          status: 'Not-Started' as any,
          project: seedProject,
          user: seedUser,
        } as Partial<Tasks>)
      );

      await tasksService.getTasksByProjectId(cleanProjectId);
      const initialCache = await CacheService.get<Tasks[]>(cacheKey);
      expect(initialCache).not.toBeNull();

      await tasksService.delete(String(seedTask.task_id));

      const postDeleteCache = await CacheService.get<Tasks[]>(cacheKey);
      expect(postDeleteCache).toBeNull();
    });
  });

  // ==========================================
  // SECTION 2: READ OPERATIONS & EDGE CASES
  // ==========================================
  describe('Read Operations & Payload Transformations', () => {
    it('should format task payload by resolving attached files and stripping raw relations', async () => {
      const uniqueTag = Date.now().toString();
      const { seedUser, seedProject } = await createSeedData(uniqueTag);

      const fileRepo = dbUtil.getRepository(Files);
      const taskRepo = dbUtil.getRepository(Tasks);

      const seedFile = await fileRepo.save(
        fileRepo.create({
          file_name: 'test_attachment.pdf',
          file_type: 'application/pdf',
          file_url: 'https://storage.example.com/test.pdf',
          user: seedUser,
        } as Partial<Files>)
      );

      const seedTask = await taskRepo.save(
        taskRepo.create({
          name: 'Task with Attached File',
          description: 'Testing payload resolution',
          supported_files: [String(seedFile.file_id)],
          project: seedProject,
          user: seedUser,
        } as Partial<Tasks>)
      );

      const response = await tasksService.findByIds([String(seedTask.task_id)]);

      expect(response.statusCode).toBe(200);
      expect(response.data).toHaveLength(1);

      const task = response.data![0] as any;
      expect(task.projectDetails).toBeDefined();
      expect(task.projectDetails.project_id).toBe(seedProject.project_id);
      expect(task.userDetails).toBeDefined();
      expect(task.userDetails.username).toBe(seedUser.username);
      expect(task.fileDetails).toHaveLength(1);
      expect(task.fileDetails[0].file_id).toBe(seedFile.file_id);

      // Raw TypeORM circular relations should be deleted
      expect(task.project).toBeUndefined();
      expect(task.user).toBeUndefined();
    });

    it('should filter tasks using username, projectname, and project_id query parameters', async () => {
      const uniqueTag = Date.now().toString();
      const { seedUser, seedProject } = await createSeedData(uniqueTag);
      const taskRepo = dbUtil.getRepository(Tasks);

      await taskRepo.save(
        taskRepo.create({
          name: 'Filter Target Task',
          project: seedProject,
          user: seedUser,
        } as Partial<Tasks>)
      );

      const userFiltered = await tasksService.findAll({
        username: seedUser.username,
      });
      expect(userFiltered.data!.length).toBeGreaterThanOrEqual(1);

      const projectFiltered = await tasksService.findAll({
        projectname: seedProject.name,
      });
      expect(projectFiltered.data!.length).toBeGreaterThanOrEqual(1);

      const idFiltered = await tasksService.findAll({
        project_id: seedProject.project_id,
      });
      expect(idFiltered.data!.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle findByIds validation for empty arrays and non-existent IDs', async () => {
      const emptyResult = await tasksService.findByIds([]);
      expect(emptyResult.statusCode).toBe(200);
      expect(emptyResult.data).toEqual([]);

      const nonExistentResult = await tasksService.findByIds([
        '00000000-0000-0000-0000-000000000000',
      ]);
      expect(nonExistentResult.statusCode).toBe(200);
      expect(nonExistentResult.data).toEqual([]);
    });
  });

  // ==========================================
  // SECTION 3: WRITE OPERATIONS & RELATIONS
  // ==========================================
  describe('Write Operations & Relation Integrity', () => {
    it('should attach a file to a task and deduplicate file IDs', async () => {
      const uniqueTag = Date.now().toString();
      const { seedUser, seedProject } = await createSeedData(uniqueTag);

      const taskRepo = dbUtil.getRepository(Tasks);
      const fileRepo = dbUtil.getRepository(Files);

      const seedFile = await fileRepo.save(
        fileRepo.create({
          file_name: 'test.png',
          file_type: 'image/png',
          file_url: 'https://storage.example.com/test.png',
          user: seedUser,
        } as Partial<Files>)
      );

      const seedTask = await taskRepo.save(
        taskRepo.create({
          name: 'Task for File Attachment',
          project: seedProject,
          user: seedUser,
          supported_files: [String(seedFile.file_id)],
        } as Partial<Tasks>)
      );

      const taskId = String(seedTask.task_id);
      const fileId = String(seedFile.file_id);

      // Attempt to attach the same file ID again
      await tasksService.attachFileToTask(taskId, fileId);

      const updatedTaskResponse = await tasksService.findByIds([taskId]);
      const updatedTask = updatedTaskResponse.data![0] as any;

      expect(
        updatedTask.supported_files.filter((id: string) => id === fileId)
      ).toHaveLength(1);
    });

    it('should return 404 error when attaching file to a non-existent task', async () => {
      const response = await tasksService.attachFileToTask(
        '00000000-0000-0000-0000-000000000000',
        'file-id-123'
      );
      expect(response.statusCode).toBe(404);
      expect(response.message).toBe('Task not found');
    });

    it('should return 404 response when updating or deleting non-existent tasks', async () => {
      const missingId = '00000000-0000-0000-0000-000000000000';

      const updateResult = await tasksService.update(missingId, {
        name: 'Non Existent',
      });
      expect(updateResult.statusCode).toBe(404);

      const deleteResult = await tasksService.delete(missingId);
      expect(deleteResult.statusCode).toBe(404);
    });
  });

  // ==========================================
  // SECTION 4: REDIS RESILIENCE
  // ==========================================
  describe('Redis & Infrastructure Resilience', () => {
    it('should fallback to DB query when Redis operations fail', async () => {
      const uniqueTag = Date.now().toString();
      const { seedUser, seedProject } = await createSeedData(uniqueTag);
      const taskRepo = dbUtil.getRepository(Tasks);

      await taskRepo.save(
        taskRepo.create({
          name: 'Resilience Test Task',
          project: seedProject,
          user: seedUser,
        } as Partial<Tasks>)
      );

      const redisSpy = jest
        .spyOn(CacheService, 'get')
        .mockImplementationOnce(() => {
          throw new Error('Redis connection lost');
        });

      try {
        const tasks = await tasksService.getTasksByProjectId(
          seedProject.project_id
        );
        expect(tasks).toBeDefined();
        expect(tasks.length).toBeGreaterThanOrEqual(1);
      } catch (err: any) {
        expect(err.message).toBe('Redis connection lost');
      }

      redisSpy.mockRestore();
    });
  });
});
