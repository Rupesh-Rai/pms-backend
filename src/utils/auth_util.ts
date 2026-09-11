import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SERVER_CONST } from './common';
import { UsersUtil } from '@/components/users/users_utils';
import { RolesUtil } from '@/components/roles/roles_util';

export const authorize = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers?.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split('Bearer ')[1]
      : null;

  if (!token) {
    res.status(401).json({
      statusCode: 401,
      status: 'error',
      message: 'Missing Authorization Token',
    });
    return;
  }

  try {
    const decodedToken = jwt.verify(
      token,
      SERVER_CONST.JWTSECRET
    ) as jwt.JwtPayload;

    req.user = {
      user_id: decodedToken['user_id'] ?? '',
      username: decodedToken['username'] ?? '',
      email: decodedToken['email'] ?? '',
      rights: [],
    };

    if (req.user.username) {
      const user = await UsersUtil.getUserFromUsername(req.user.username);

      if (user && user.role_id) {
        // Pass user.role_id as a single-item array to RolesUtil
        const rights = await RolesUtil.getAllRightsFromRoles([user.role_id]);
        req.user.rights = rights;
      }
    }

    next();
  } catch (error: any) {
    console.error(`Authorization error: ${error?.message || error}`);
    res.status(401).json({
      statusCode: 401,
      status: 'error',
      message: 'Invalid Token',
    });
  }
};
