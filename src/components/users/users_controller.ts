import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { BaseController } from '@/utils/base_controller';
import { UsersService } from '@/components/users/users_service';
import { RolesUtil } from '@/components/roles/roles_routes';
import {
  encryptString,
  bcryptCompare,
  hasPermission,
  Rights,
  SERVER_CONST,
} from '@/utils/common';

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
}

export class UsersUtil {
  public static async getUserFromUsername(username: string) {
    try {
      if (username) {
        const service = await UsersService.createInstance();
        // Queries database for the given username
        const result = await service.findAll({
          username: username.toLowerCase(),
        });
        if (result.data && result.data.length > 0) {
          return result.data[0];
        }
      }
    } catch (error: any) {
      console.error(
        `Error in UsersUtil.getUserFromUsername: ${error?.message || error}`
      );
    }
    return null;
  }
}
