import type { Express } from 'express';
import { body } from 'express-validator';
import { validate } from '@/utils/validator';
import { Rights } from '@/utils/common';
import { RolesController } from './roles_controller';
import { RolesService } from './roles_service';
import { authorize } from '@/utils/auth_util';

export const validRoleInput = [
  body('name').trim().notEmpty().withMessage('It should be required'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('It has maximum limit of 200 characters'),
];

export class RolesUtil {
  /**
   * Retrieves all possible permissions from the defined rights in the Rights object.
   * @returns {string[]} An array of permissions
   */
  public static getAllPermissionsFromRights(): string[] {
    let permissions: string[] = [];

    for (const moduleKey of Object.keys(Rights) as (keyof typeof Rights)[]) {
      const moduleRights = Rights[moduleKey];
      if ('ALL' in moduleRights && typeof moduleRights.ALL === 'string') {
        const sectionValues = moduleRights.ALL.split(',');
        permissions = [...permissions, ...sectionValues];
      }
    }

    return permissions;
  }

  /**
   * Verifies whether all provided role_ids exist in the database.
   * @param {string[]} role_ids - Array of UUIDs to validate
   * @returns {Promise<boolean>} True if all IDs exist, false otherwise
   */
  public static async checkValidRoleIds(role_ids: string[]): Promise<boolean> {
    try {
      const roleService = await RolesService.createInstance();
      const roles = await roleService.findByIds(role_ids);

      return roles?.data?.length === role_ids.length;
    } catch (error) {
      console.error('Error in checkValidRoleIds():', error);
      return false;
    }
  }

  /**
   * Fetches roles by IDs and consolidates unique rights strings.
   * @param {string[]} role_ids - Array of role UUIDs
   * @returns {Promise<string[]>} Consolidated unique permissions/rights
   */
  public static async getAllRightsFromRoles(
    role_ids: string[]
  ): Promise<string[]> {
    try {
      if (!role_ids || role_ids.length === 0) return [];

      const roleService = await RolesService.createInstance();
      const queryData = await roleService.findByIds(role_ids);
      const roles = queryData?.data ? queryData.data : [];

      let rights: string[] = [];

      roles.forEach((role: any) => {
        if (role?.rights) {
          // Split rights CSV string and trim whitespace
          const rightFromRole: string[] = role.rights
            .split(',')
            .map((r: string) => r.trim());
          // Deduplicate rights across roles using a Set
          rights = [...new Set([...rights, ...rightFromRole])];
        }
      });

      return rights;
    } catch (error: any) {
      console.error(
        `Error in RolesUtil.getAllRightsFromRoles: ${error?.message || error}`
      );
      return [];
    }
  }
}

export class RoleRoutes {
  private readonly baseEndPoint = '/api/roles';

  constructor(app: Express) {
    const controller = new RolesController();

    app
      .route(this.baseEndPoint)
      .all(authorize)
      .get(controller.getAllHandler)
      .post(validate(validRoleInput), controller.addHandler);

    app
      .route(`${this.baseEndPoint}/:id`)
      .all(authorize)
      .get(controller.getOneHandler)
      .put(validate(validRoleInput), controller.updateHandler)
      .delete(controller.deleteHandler);

    console.log('Initialized routes for RoleRoutes');
  }
}
