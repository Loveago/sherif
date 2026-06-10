import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

const isLocalDev = env.NODE_ENV !== 'production';
const allowedOrigins = new Set([env.FRONTEND_URL, 'http://127.0.0.1:3000', 'http://localhost:3000']);

export const originProtection = (request: Request, response: Response, next: NextFunction) => {
  if (safeMethods.has(request.method)) {
    return next();
  }

  const origin = request.headers.origin;

  if (!origin || allowedOrigins.has(origin) || isLocalDev) {
    return next();
  }

  return response.status(403).json({
    success: false,
    message: 'Origin not allowed',
  });
};
