import type { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { verifyToken } from '../utils/security.js';

export const requireAuth = (request: Request, response: Response, next: NextFunction) => {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    return response.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    request.auth = verifyToken(token);
    return next();
  } catch {
    return response.status(401).json({ success: false, message: 'Invalid token' });
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.auth) {
      return response.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!roles.includes(request.auth.role)) {
      return response.status(403).json({ success: false, message: 'Access denied' });
    }

    return next();
  };
};
