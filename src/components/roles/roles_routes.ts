import type { Express } from 'express';
import { body } from 'express-validator';
import { validate } from '@/utils/validator';
import { RolesController } from './roles_controller';
import { authorize } from '@/utils/auth_util';

export const validRoleInput = [
  body('name').trim().notEmpty().withMessage('It should be required'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('It has maximum limit of 200 characters'),
];

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
