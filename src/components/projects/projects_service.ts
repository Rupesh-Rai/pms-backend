import { Repository, In } from 'typeorm';
import { BaseService } from '@/utils/base_service';
import { DatabaseUtil } from '@/utils/db';
import { Projects } from './projects_entity';
import { Users } from '../users/users_entity';
import { CacheService } from '@/utils/redis';
import { CacheKeys, CacheTTL } from '@/utils/cache_utils';

export class ProjectsService extends BaseService<Projects> {
  private constructor(repository: Repository<Projects>) {
    super(repository);
  }

  public static async createInstance(): Promise<ProjectsService> {
    const dbUtil = await DatabaseUtil.getInstance();
    const repository = dbUtil.getRepository(Projects);
    return new ProjectsService(repository);
  }

  /**
   * Helper method to map scalar user_ids array to populated user objects across project records.
   */
  private async populateUsers(projects: Projects[]) {
    if (!projects || projects.length === 0) {
      return projects;
    }

    const allUserIds = Array.from(
      new Set(projects.flatMap((project) => project.user_ids || []))
    );

    if (allUserIds.length === 0) {
      return projects;
    }

    const dbUtil = await DatabaseUtil.getInstance();
    const userRepository: Repository<Users> = dbUtil.getRepository(Users);

    const usersList = await userRepository.find({
      where: { user_id: In(allUserIds) },
      select: {
        user_id: true,
        username: true,
      },
    });

    const userMap = new Map<string, { user_id: string; username: string }>();
    usersList.forEach((u) => {
      userMap.set(u.user_id, {
        user_id: u.user_id,
        username: u.username,
      });
    });

    return projects.map((project) => {
      const { user_ids, ...rest } = project as any;
      return {
        ...rest,
        users: (user_ids || [])
          .map((id: string) => userMap.get(id))
          .filter(Boolean),
      };
    });
  }

  /**
   * Overrides BaseService.findAll to return populated user objects.
   */
  public override async findAll(queryParams?: any) {
    const baseResult = await super.findAll(queryParams);
    if (!baseResult.data) return baseResult;

    const populatedData = await this.populateUsers(baseResult.data);
    return { ...baseResult, data: populatedData };
  }

  /**
   * Overrides BaseService.findByIds to return populated user objects.
   */
  public override async findByIds(ids: string[]) {
    const baseResult = await super.findByIds(ids);
    if (!baseResult.data) return baseResult;

    const populatedData = await this.populateUsers(baseResult.data);
    return { ...baseResult, data: populatedData };
  }

  /**
   * Overrides BaseService.update to return populated user objects in the updated payload.
   */
  public override async update(id: string, updatePayload: any) {
    const baseResult = await super.update(id, updatePayload);
    if (!baseResult.data) return baseResult;

    // Handle single entity vs array responses returned by base update
    const dataArray = Array.isArray(baseResult.data)
      ? baseResult.data
      : [baseResult.data];
    const populatedData = await this.populateUsers(dataArray);

    return {
      ...baseResult,
      data: Array.isArray(baseResult.data) ? populatedData : populatedData[0],
    };
  }

  /**
   * READ: Cache-Aside strategy for fetching single project details
   */
  public async getProjectById(projectId: string | number) {
    const cacheKey = CacheKeys.projects.byId(projectId);

    // 1. Check Redis Cache
    const cachedProject = await CacheService.get<any>(cacheKey);
    if (cachedProject) {
      return cachedProject;
    }

    // 2. Cache Miss: Query DB using inherited findByIds to ensure populated users
    const result = await this.findByIds([String(projectId)]);
    if (!result.data || result.data.length === 0) {
      return null;
    }

    const project = result.data[0];

    // 3. Store in Redis with project-specific TTL (30 minutes)
    await CacheService.set(cacheKey, project, CacheTTL.PROJECT);

    return project;
  }

  /**
   * WRITE: Update project and invalidate all associated cache keys
   */
  public async updateProject(projectId: string | number, updateData: any) {
    const idStr = String(projectId);

    // Perform update and get populated result via inherited method
    const result = await this.update(idStr, updateData);

    // Invalidate individual project cache and dependent stats key
    await CacheService.del(
      CacheKeys.projects.byId(idStr),
      CacheKeys.projects.stats(idStr)
    );

    return result.data;
  }

  /**
   * WRITE: Delete project and purge all related sub-keys using wildcard pattern
   */
  public async deleteProject(projectId: string | number) {
    const idStr = String(projectId);

    // Delete using TypeORM repository
    await this.repository.delete(idStr);

    // Purge project:10, project:10:tasks, project:10:members, project:10:stats
    await CacheService.clearPattern(CacheKeys.projects.wildcard(idStr));
  }
}
