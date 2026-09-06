import { Repository } from 'typeorm';
import { BaseService } from '@/utils/base_service';
import { DatabaseUtil } from '@/utils/db';
import { Users } from './users_entity';

export class UsersService extends BaseService<Users> {
  private constructor(userRepository: Repository<Users>) {
    super(userRepository);
  }

  public static async createInstance(): Promise<UsersService> {
    const dbUtil = await DatabaseUtil.getInstance();
    const userRepository = dbUtil.getRepository(Users);
    return new UsersService(userRepository);
  }
}
