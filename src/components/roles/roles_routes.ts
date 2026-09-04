import type { Express } from 'express';
import { body } from 'express-validator';
import { validate } from '@/utils/validator';
import { Rights } from '@/utils/common';
import { RolesController } from './roles_controller';

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
}

export class RoleRoutes {
  private readonly baseEndPoint = '/api/roles';

  constructor(app: Express) {
    const controller = new RolesController();

    app
      .route(this.baseEndPoint)
      .get(controller.getAllHandler)
      .post(validate(validRoleInput), controller.addHandler);

    app
      .route(`${this.baseEndPoint}/:id`)
      .get(controller.getOneHandler)
      .put(validate(validRoleInput), controller.updateHandler)
      .delete(controller.deleteHandler);

    console.log('Initialized routes for RoleRoutes');
  }
}
