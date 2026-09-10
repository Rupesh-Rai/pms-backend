import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { BaseController } from '@/utils/base_controller';
import { UsersService } from '@/components/users/users_service';
import { RolesUtil } from '@/components/roles/roles_util';
import {
  encryptString,
  bcryptCompare,
  hasPermission,
  Rights,
  SERVER_CONST,
} from '@/utils/common';
import { config } from '@/utils/config';
import { sendEmail } from '@/utils/email_util';
import { UsersUtil } from './users_util';

export class UsersController extends BaseController {
  /**
   * Handles user creation POST requests.
   */
  public addHandler = async (req: Request, res: Response): Promise<void> => {
    if (!hasPermission(req.user?.rights, Rights.USERS.ADD)) {
      res.status(403).json({
        statusCode: 403,
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const { v4: uuidv4 } = await import('uuid');

      const service = await UsersService.createInstance();
      const userPayload = req.body;

      if (userPayload.role_ids && userPayload.role_ids.length > 0) {
        const isValidRole = await RolesUtil.checkValidRoleIds(
          userPayload.role_ids
        );
        if (!isValidRole) {
          res.status(400).json({
            statusCode: 400,
            status: 'error',
            message: 'Invalid role_ids',
          });
          return;
        }
      }

      // Extract the primary role ID from role_ids array or direct role_id property
      const primaryRoleId =
        userPayload.role_ids && userPayload.role_ids.length > 0
          ? userPayload.role_ids[0]
          : userPayload.role_id;

      const newUser = {
        ...userPayload,
        user_id: uuidv4(),
        role_id: primaryRoleId, // Assigns the extracted UUID to the required DB column
        email: userPayload.email?.toLowerCase(),
        username: userPayload.username?.toLowerCase(),
        password: await encryptString(userPayload.password),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const createdUser = await service.create(newUser);
      res.status(createdUser.statusCode).json(createdUser);
    } catch (error: any) {
      console.error(
        `Error in UsersController.addHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles fetching all users with optional query filtering.
   */
  public getAllHandler = async (req: Request, res: Response): Promise<void> => {
    if (!hasPermission(req.user?.rights, Rights.USERS.GET_ALL)) {
      res.status(403).json({
        statusCode: 403,
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const service = await UsersService.createInstance();
      const result = await service.findAll(req.query);
      res.status(result.statusCode).json(result);
    } catch (error: any) {
      console.error(
        `Error in UsersController.getAllHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles fetching a single user by primary key ID.
   */
  public getOneHandler = async (req: Request, res: Response): Promise<void> => {
    if (!hasPermission(req.user?.rights, Rights.USERS.GET_DETAILS)) {
      res.status(403).json({
        statusCode: 403,
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const service = await UsersService.createInstance();
      const id = req.params.id as string;

      // Passes [id] array to BaseService.findByIds()
      const result = await service.findByIds([id]);
      res.status(result.statusCode).json(result);
    } catch (error: any) {
      console.error(
        `Error in UsersController.getOneHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles updating an existing user account.
   */
  public updateHandler = async (req: Request, res: Response): Promise<void> => {
    if (!hasPermission(req.user?.rights, Rights.USERS.EDIT)) {
      res.status(403).json({
        statusCode: 403,
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const service = await UsersService.createInstance();
      const id = req.params.id as string;
      const updatePayload = req.body;

      if (updatePayload.role_ids && updatePayload.role_ids.length > 0) {
        const isValidRole = await RolesUtil.checkValidRoleIds(
          updatePayload.role_ids
        );
        if (!isValidRole) {
          res.status(400).json({
            statusCode: 400,
            status: 'error',
            message: 'Invalid role_ids',
          });
          return;
        }
      }

      if (updatePayload.email) {
        updatePayload.email = updatePayload.email.toLowerCase();
      }
      if (updatePayload.username) {
        updatePayload.username = updatePayload.username.toLowerCase();
      }
      if (updatePayload.password) {
        updatePayload.password = await encryptString(updatePayload.password);
      }

      updatePayload.updated_at = new Date();

      const result = await service.update(id, updatePayload);
      res.status(result.statusCode).json(result);
    } catch (error: any) {
      console.error(
        `Error in UsersController.updateHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles user deletion by ID.
   */
  public deleteHandler = async (req: Request, res: Response): Promise<void> => {
    if (!hasPermission(req.user?.rights, Rights.USERS.DELETE)) {
      res.status(403).json({
        statusCode: 403,
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const service = await UsersService.createInstance();
      const id = req.params.id as string;
      const result = await service.delete(id);
      res.status(result.statusCode).json(result);
    } catch (error: any) {
      console.error(
        `Error in UsersController.deleteHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles user login requests.
   */
  public loginHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      const service = await UsersService.createInstance();

      // Find user by normalized email
      const result = await service.findAll({ email: email?.toLowerCase() });
      if (!result.data || result.data.length < 1) {
        res.status(404).json({
          statusCode: 404,
          status: 'error',
          message: 'Email not found',
        });
        return;
      }

      const user = result.data[0];

      // Compare password using bcryptCompare
      const isMatch = await bcryptCompare(password, user.password);
      if (!isMatch) {
        res.status(401).json({
          statusCode: 401,
          status: 'error',
          message: 'Password is not valid',
        });
        return;
      }

      // Payload includes role rights to support RBAC permission checks
      const payload = {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        rights: user.role?.rights || '',
      };

      const accessToken = jwt.sign(payload, SERVER_CONST.JWTSECRET, {
        expiresIn: SERVER_CONST.ACCESS_TOKEN_EXPIRY_TIME_SECONDS,
      });

      const refreshToken = jwt.sign(payload, SERVER_CONST.JWTSECRET, {
        expiresIn: SERVER_CONST.REFRESH_TOKEN_EXPIRY_TIME_SECONDS,
      });

      res.status(200).json({
        statusCode: 200,
        status: 'success',
        message: 'Login successful',
        data: {
          accessToken,
          refreshToken,
          user: {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
          },
        },
      });
    } catch (error: any) {
      console.error(
        `Error in UsersController.loginHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Generates a new access token using a valid refresh token.
   */
  public getAccessTokenFromRefreshToken = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const refreshToken = req.body.refreshToken;

      if (!refreshToken) {
        res.status(400).json({
          statusCode: 400,
          status: 'error',
          message: 'Refresh token is required',
        });
        return;
      }

      // Verify the refresh token
      jwt.verify(
        refreshToken,
        SERVER_CONST.JWTSECRET,
        (err: any, decodedUser: any) => {
          if (err) {
            res.status(403).json({
              statusCode: 403,
              status: 'error',
              message: 'Invalid Refresh Token',
            });
            return;
          }

          // Exclude internal JWT timing fields before signing new token
          const { iat, exp, nbf, ...cleanPayload } = decodedUser;

          const accessToken = jwt.sign(cleanPayload, SERVER_CONST.JWTSECRET, {
            expiresIn: SERVER_CONST.ACCESS_TOKEN_EXPIRY_TIME_SECONDS,
          });

          res.status(200).json({
            statusCode: 200,
            status: 'success',
            data: { accessToken },
          });
        }
      );
    } catch (error: any) {
      console.error(
        `Error in UsersController.getAccessTokenFromRefreshToken: ${
          error?.message || error
        }`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Change password handler for authenticated users.
   */
  public changePassword = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.params.id as string;

    console.log(req.body);

    console.log(
      `changePassword called for userId: ${userId}, oldPassword: ${oldPassword}, newPassword: ${newPassword}`
    );

    try {
      const service = await UsersService.createInstance();

      // 1. Fetch target user by ID using findByIds
      const findUserResult = await service.findByIds([userId]);
      const user =
        findUserResult.data && findUserResult.data.length > 0
          ? findUserResult.data[0]
          : null;

      if (!user) {
        res.status(404).json({
          statusCode: 404,
          status: 'error',
          message: 'User Not Found',
        });
        return;
      }

      // 2. Ensure users can only modify their own password
      if (user.username?.toLowerCase() !== req.user?.username?.toLowerCase()) {
        res.status(400).json({
          statusCode: 400,
          status: 'error',
          message: 'User can change only own password',
        });
        return;
      }

      // 3. Verify old password match
      const isOldPasswordValid = await bcryptCompare(
        oldPassword,
        user.password
      );

      if (!isOldPasswordValid) {
        res.status(400).json({
          statusCode: 400,
          status: 'error',
          message: 'oldPassword is not matched',
        });
        return;
      }

      // 4. Encrypt new password and update record
      const hashedNewPassword = await encryptString(newPassword);

      const updateResult = await service.update(userId, {
        password: hashedNewPassword,
        updated_at: new Date(),
      });

      if (updateResult.statusCode === 200) {
        res.status(200).json({
          statusCode: 200,
          status: 'success',
          message: 'Password is updated successfully',
        });
        return;
      }

      res.status(updateResult.statusCode).json(updateResult);
    } catch (error: any) {
      console.error(
        `Error in UsersController.changePassword: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles password recovery link generation and email dispatch.
   */
  public forgotPassword = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const { email } = req.body;

    try {
      // 1. Fetch user by email
      const user = await UsersUtil.getUserByEmail(email?.toLowerCase());

      if (!user) {
        res.status(404).json({
          statusCode: 404,
          status: 'error',
          message: 'User Not Found',
        });
        return;
      }

      // 2. Generate a signed reset JWT valid for 1 hour
      const resetToken = jwt.sign(
        { user_id: user.user_id, email: user.email },
        SERVER_CONST.JWTSECRET,
        { expiresIn: '1h' }
      );

      // 3. Construct recovery link
      const resetLink = `${config.front_app_url}/reset-password?token=${resetToken}`;

      const emailHtml = `
        <p>Hello ${user.username},</p>
        <p>We received a request to reset your password. If you didn't initiate this request, please ignore this email.</p>
        <p>To reset your password, please click the link below:</p>
        <p><a href="${resetLink}" style="background-color: #007bff; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 5px; display: inline-block;">Reset Password</a></p>
        <p>If the link doesn't work, copy and paste the following URL into your browser:</p>
        <p>${resetLink}</p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>Best regards,<br>PMS Team</p>
      `;

      // 4. Send email via email utility
      const emailStatus = await sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        html: emailHtml,
      });

      if (emailStatus) {
        res.status(200).json({
          statusCode: 200,
          status: 'success',
          message: 'Reset link has been sent to your email address',
        });
        return;
      }

      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Failed to send reset email. Please try again later.',
      });
    } catch (error: any) {
      console.error(
        `Error in UsersController.forgotPassword: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles setting a new password using a valid password reset token (passed in Authorization header).
   */
  public resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { newPassword } = req.body;
    const userId = req.user?.user_id;

    if (!userId) {
      res.status(401).json({
        statusCode: 401,
        status: 'error',
        message: 'Invalid or missing authentication token',
      });
      return;
    }

    try {
      const service = await UsersService.createInstance();

      // 1. Verify user exists
      const findUserResult = await service.findByIds([userId]);
      const user =
        findUserResult.data && findUserResult.data.length > 0
          ? findUserResult.data[0]
          : null;

      if (!user) {
        res.status(404).json({
          statusCode: 404,
          status: 'error',
          message: 'User Not Found',
        });
        return;
      }

      // 2. Encrypt new password
      const hashedNewPassword = await encryptString(newPassword);

      // 3. Update database record
      const updateResult = await service.update(userId, {
        password: hashedNewPassword,
        updated_at: new Date(),
      });

      if (updateResult.statusCode === 200) {
        res.status(200).json({
          statusCode: 200,
          status: 'success',
          message: 'Password reset successfully',
        });
        return;
      }

      res.status(updateResult.statusCode).json(updateResult);
    } catch (error: any) {
      console.error(
        `Error in UsersController.resetPassword: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };
}
