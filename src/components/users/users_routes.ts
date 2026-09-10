import type { Express } from 'express';
import { body } from 'express-validator';
import { validate } from '@/utils/validator';
import { RolesUtil } from '@/components/roles/roles_util';
import { UsersController } from './users_controller';
import { authorize } from '@/utils/auth_util';

// ============================================================================
// Input Validation Schema Definitions
// ============================================================================

/**
 * Validation rules for user creation and full profile updates.
 */
export const validUserInput = [
  body('username').trim().notEmpty().withMessage('Username is required'),

  body('email').isEmail().withMessage('Must be a valid email address'),

  body('password')
    .isLength({ min: 6, max: 12 })
    .withMessage('Password must be between 6 and 12 characters in length')
    .isStrongPassword({
      minLowercase: 1,
      minUppercase: 1,
      minSymbols: 1,
      minNumbers: 1,
    })
    .withMessage(
      'Password should include at least one uppercase letter, one lowercase letter, one special symbol, and one numerical digit.'
    ),

  body('role_ids')
    .isArray()
    .withMessage('role_ids must be an array of role UUIDs')
    .custom(async (value: string[]) => {
      if (value?.length > 0 && Array.isArray(value)) {
        const uuidPattern =
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

        // 1. Format check for valid UUID strings
        const isValid = value.every((uuid) => uuidPattern.test(uuid.trim()));
        if (!isValid) {
          throw new Error('Contains invalid UUID format for role');
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

/**
 * Validation rules for password modification by authenticated users.
 */
export const validChangePasswordInput = [
  body('oldPassword').notEmpty().withMessage('oldPassword is required'),

  body('newPassword')
    .isLength({ min: 6, max: 32 })
    .withMessage('newPassword must be between 6 and 32 characters in length')
    .isStrongPassword({
      minLength: 6,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage(
      'newPassword should include at least one uppercase letter, one lowercase letter, one special symbol, and one numerical digit.'
    ),
];

/**
 * Validation rules for initiating password recovery via email.
 */
export const validForgotPasswordInput = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email address'),
];

/**
 * Validation rules for reset password submission after receiving a reset token.
 */
export const validResetPasswordInput = [
  body('newPassword')
    .isLength({ min: 6, max: 32 })
    .withMessage('newPassword must be between 6 and 32 characters in length')
    .isStrongPassword({
      minLength: 6,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage(
      'newPassword should include at least one uppercase letter, one lowercase letter, one special symbol, and one numerical digit.'
    ),
];

// ============================================================================
// User Routes Definition
// ============================================================================

export class UserRoutes {
  private readonly baseEndPoint = '/api/users';

  constructor(app: Express) {
    const controller = new UsersController();

    // ------------------------------------------------------------------------
    // 1. Public Authentication & Password Recovery Routes
    // Note: Registered before parameterized routes (/:id) to prevent matching
    // ------------------------------------------------------------------------

    // Authenticate user credentials and return access/refresh tokens
    app.post(
      `${this.baseEndPoint}/login`,
      validate([
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
      ]),
      controller.loginHandler
    );

    // Issue a new access token using a valid refresh token
    app.post(
      `${this.baseEndPoint}/refresh-token`,
      validate([
        body('refreshToken')
          .notEmpty()
          .withMessage('Refresh token is required'),
      ]),
      controller.getAccessTokenFromRefreshToken
    );

    // Request password reset link dispatch via email
    app.post(
      `${this.baseEndPoint}/forgot-password`,
      validate(validForgotPasswordInput),
      controller.forgotPassword
    );

    // ------------------------------------------------------------------------
    // 2. Authenticated Actions
    // ------------------------------------------------------------------------

    // Update password for an authenticated session
    app
      .route(`${this.baseEndPoint}/changePassword/:id`)
      .all(authorize)
      .post(validate(validChangePasswordInput), controller.changePassword);

    // Reset password using a valid reset token (from email link)
    app.post(
      `${this.baseEndPoint}/reset-password`,
      authorize, // Extracts and verifies token from "Authorization: Bearer <token>" header
      validate(validResetPasswordInput),
      controller.resetPassword
    );

    // ------------------------------------------------------------------------
    // 3. User Resource Collection Endpoints (CRUD)
    // ------------------------------------------------------------------------

    // Fetch all users or create a new user record
    app
      .route(this.baseEndPoint)
      .get(authorize, controller.getAllHandler)
      .post(authorize, validate(validUserInput), controller.addHandler);

    // Individual user resource actions (Must be registered last due to :id parameter matching)
    app
      .route(`${this.baseEndPoint}/:id`)
      .get(authorize, controller.getOneHandler)
      .put(authorize, validate(validUserInput), controller.updateHandler)
      .delete(authorize, controller.deleteHandler);

    console.log('Initialized routes for UserRoutes');
  }
}
