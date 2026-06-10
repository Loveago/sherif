import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export const hashPassword = async (password: string) => bcrypt.hash(password, 12);

export const comparePassword = async (password: string, passwordHash: string) =>
  bcrypt.compare(password, passwordHash);

export const signToken = (payload: { userId: string; role: UserRole }) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] });

export const verifyToken = (token: string) =>
  jwt.verify(token, env.JWT_SECRET) as {
    userId: string;
    role: UserRole;
  };
