import { Repository, In } from 'typeorm';
import { BaseService } from '@/utils/base_service';
import { DatabaseUtil } from '@/utils/db';
import { Projects } from './projects_entity';
import { Users } from '../users/users_entity';

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
}
