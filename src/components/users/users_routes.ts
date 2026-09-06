import type { Express } from 'express';
import { body } from 'express-validator';
import { validate } from '@/utils/validator';
import { RolesUtil } from '@/components/roles/roles_routes';
import { UsersController } from './users_controller';
import { authorize } from '@/utils/auth_util';

export const validUserInput = [
  body('username').trim().notEmpty().withMessage('It should be required'),

  body('email').isEmail().withMessage('It should be valid emailId'),

  body('password')
    .isLength({ min: 6, max: 12 })
    .withMessage('It must be between 6 and 12 characters in length')
    .isStrongPassword({
      minLowercase: 1,
      minUppercase: 1,
      minSymbols: 1,
      minNumbers: 1,
    })
    .withMessage(
      'It should include at least one uppercase letter, one lowercase letter, one special symbol, and one numerical digit.'
    ),

  body('role_ids')
    .isArray()
    .withMessage('It must be an array of uuids of roles')
    .custom(async (value: string[]) => {
      if (value?.length > 0 && Array.isArray(value)) {
        const uuidPattern =
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

        // 1. Format check for valid UUID strings
        const isValid = value.every((uuid) => uuidPattern.test(uuid.trim()));
        if (!isValid) {
          throw new Error('It has invalid uuids for role');
        }

        // 2. Database existence check for all role IDs
        const rolesExist = await RolesUtil.checkValidRoleIds(value);
        if (!rolesExist) {
          throw new Error(
            'One or more specified role_ids do not exist in the system'
          );
        }
      }

      return true;
    }),
];

export class UserRoutes {
  private readonly baseEndPoint = '/api/users';

  constructor(app: Express) {
    const controller = new UsersController();

    app
      .route(this.baseEndPoint)
      .get(authorize, controller.getAllHandler)
      .post(authorize, validate(validUserInput), controller.addHandler);

    app
      .route(`${this.baseEndPoint}/:id`)
      .get(authorize, controller.getOneHandler)
      .put(authorize, validate(validUserInput), controller.updateHandler)
      .delete(authorize, controller.deleteHandler);

    console.log('Initialized routes for UserRoutes');
    // Login route
    app.post(
      `${this.baseEndPoint}/login`,
      validate([
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
      ]),
      controller.loginHandler
    );

    // Refresh Token route
    app.post(
      `${this.baseEndPoint}/refresh-token`,
      validate([
        body('refreshToken')
          .notEmpty()
          .withMessage('Refresh token is required'),
      ]),
      controller.getAccessTokenFromRefreshToken
    );
  }
}
