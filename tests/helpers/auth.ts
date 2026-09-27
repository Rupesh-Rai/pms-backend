import jwt from 'jsonwebtoken';

export const getTestToken = (payload = {}) => {
  const defaultUser = {
    user_id: 'test-user-id',
    username: 'admin',
    email: 'admin@admin.com',
    ...payload,
  };

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  return jwt.sign(defaultUser, secret, {
    expiresIn: '1h',
  });
};
