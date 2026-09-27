import { DatabaseUtil } from '@/utils/db';
import { Roles } from '@/components/roles/roles_entity';
import { Users } from '@/components/users/users_entity';
import { getTestToken } from './auth';

export const createTestAdmin = async () => {
  const dbUtil = await DatabaseUtil.getInstance();

  const roleRepository = dbUtil.getRepository(Roles);
  const userRepository = dbUtil.getRepository(Users);

  const role = roleRepository.create({
    name: 'E2E Task Admin',
    description: 'Role used by E2E tests',
    rights: 'get_all_tasks,edit_task',
  });

  const savedRole = await roleRepository.save(role);

  const user = userRepository.create({
    fullname: 'E2E Admin',
    username: 'admin',
    email: 'admin@admin.com',
    password: 'test-password',
    role_id: savedRole.role_id,
  });

  const savedUser = await userRepository.save(user);

  const token = getTestToken({
    user_id: savedUser.user_id,
    username: savedUser.username,
    email: savedUser.email,
  });

  return {
    user: savedUser,
    role: savedRole,
    token,
  };
};
