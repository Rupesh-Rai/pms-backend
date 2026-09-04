import { Repository } from 'typeorm';
import { BaseService } from '@/utils/base_service';
import { DatabaseUtil } from '@/utils/db';
import { Roles } from './roles_entity';

export class RolesService extends BaseService<Roles> {
  // Private constructor prevents direct `new RolesService()` instantiation
  // before async database initialization completes
  private constructor(roleRepository: Repository<Roles>) {
    super(roleRepository);
  }

  public static async createInstance(): Promise<RolesService> {
    const databaseUtil = await DatabaseUtil.getInstance();
    const roleRepository: Repository<Roles> = databaseUtil.getRepository(Roles);

    return new RolesService(roleRepository);
  }
}
