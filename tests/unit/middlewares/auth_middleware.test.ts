import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authorize } from '@/middlewares/auth_middleware'; // Update import if moved to middleware
import { UsersUtil } from '@/components/users/users_utils';
import { RolesUtil } from '@/components/roles/roles_util';
import { SERVER_CONST } from '@/utils/common';

// 1. Mock dependent utility modules and JWT
jest.mock('jsonwebtoken');
jest.mock('@/components/users/users_utils');
jest.mock('@/components/roles/roles_util');

describe('Authorization Middleware Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if Authorization header is missing', async () => {
    await authorize(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 401,
      status: 'error',
      message: 'Missing Authorization Token',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid or expired', async () => {
    mockRequest.headers = { authorization: 'Bearer invalid_token' };
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('jwt expired');
    });

    await authorize(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(jwt.verify).toHaveBeenCalledWith(
      'invalid_token',
      SERVER_CONST.JWTSECRET
    );
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 401,
      status: 'error',
      message: 'Invalid Token',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should authenticate user and set empty rights if user has no role', async () => {
    const mockPayload = {
      user_id: 'usr_100',
      username: 'rupesh',
      email: 'rupesh@example.com',
    };

    mockRequest.headers = { authorization: 'Bearer valid_token' };
    (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
    (UsersUtil.getUserFromUsername as jest.Mock).mockResolvedValue({
      user_id: 'usr_100',
      username: 'rupesh',
      role_id: null,
    });

    await authorize(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockRequest.user).toEqual({
      user_id: 'usr_100',
      username: 'rupesh',
      email: 'rupesh@example.com',
      rights: [],
    });
    expect(nextFunction).toHaveBeenCalledTimes(1);
  });

  it('should authenticate user and attach permission rights when valid role exists', async () => {
    const mockPayload = {
      user_id: 'usr_100',
      username: 'rupesh',
      email: 'rupesh@example.com',
    };

    const mockRights = ['projects:read', 'projects:write', 'tasks:create'];

    mockRequest.headers = { authorization: 'Bearer valid_token' };
    (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
    (UsersUtil.getUserFromUsername as jest.Mock).mockResolvedValue({
      user_id: 'usr_100',
      username: 'rupesh',
      role_id: 'role_admin',
    });
    (RolesUtil.getAllRightsFromRoles as jest.Mock).mockResolvedValue(
      mockRights
    );

    await authorize(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(RolesUtil.getAllRightsFromRoles).toHaveBeenCalledWith([
      'role_admin',
    ]);
    expect(mockRequest.user).toEqual({
      user_id: 'usr_100',
      username: 'rupesh',
      email: 'rupesh@example.com',
      rights: mockRights,
    });
    expect(nextFunction).toHaveBeenCalledTimes(1);
  });
});
