import jwt from 'jsonwebtoken';

const secretKey = process.env.JWT_SECRET || 'your_secret_key';

export const signToken = (userId: string) => {
  return jwt.sign({ id: userId }, secretKey, { expiresIn: '1h' });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, secretKey);
};