import { Roles } from '@/components/roles/roles_entity';
import { RolesService } from '@/components/roles/roles_service';
import { RolesUtil } from '@/components/roles/roles_routes';
import { UsersService } from '@/components/users/users_service';
import { encryptString } from '@/utils/common';
import { config } from '@/utils/config';

export class DDLUtil {
  private static superAdminRoleId: string;

  /**
   * Creates the default SuperAdmin role if it does not already exist.
   */
  public static async addDefaultRole(): Promise<boolean> {
    try {
      const { v4: uuidv4 } = await import('uuid');
      const service = await RolesService.createInstance();
      const rights = RolesUtil.getAllPermissionsFromRights();

      const role: Partial<Roles> = {
        role_id: uuidv4(),
        name: 'SuperAdmin',
        description: 'Admin having all permissions',
        rights: rights.join(','),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = await service.create(role);
      console.log('Add Default Role Result:', result);

      if (result.statusCode === 201 && result.data) {
        this.superAdminRoleId = result.data.role_id;
        return true;
      } else if (result.statusCode === 409) {
        // Role already exists, fetch its role_id
        const roles = await service.findAll({ name: 'SuperAdmin' });
        if (roles.data && roles.data.length > 0) {
          this.superAdminRoleId = roles.data[0].role_id;
          return true;
        }
      }

      return false;
    } catch (error: any) {
      console.error(`Error in addDefaultRole(): ${error?.message || error}`);
      return false;
    }
  }

  /**
   * Creates the default SuperAdmin user associated with the SuperAdmin role.
   */
  public static async addDefaultUser(): Promise<boolean> {
    try {
      if (!this.superAdminRoleId) {
        console.error(
          'Cannot create default user: superAdminRoleId is not set.'
        );
        return false;
      }

      const { v4: uuidv4 } = await import('uuid');
      const service = await UsersService.createInstance();

      const user = {
        user_id: uuidv4(),
        fullname: 'Super Admin',
        username: 'superadmin',
        email: config.default_user.email,
        password: await encryptString(config.default_user.password),
        role_id: this.superAdminRoleId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = await service.create(user);
      console.log('Add Default User Result:', result);

      return result.statusCode === 201;
    } catch (error: any) {
      console.error(`Error in addDefaultUser(): ${error?.message || error}`);
      return false;
    }
  }
}
