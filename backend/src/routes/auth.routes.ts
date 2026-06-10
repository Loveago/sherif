import { Router } from 'express';
import { loginSchema, registerSchema } from '../schemas/auth.schema.js';
import { validate } from '../middleware/validate.js';
import { getCurrentUser, loginUser, registerUser } from '../services/auth.service.js';
import { createSuccessResponse } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), async (request, response, next) => {
  try {
    const result = await registerUser(request.body);
    return response.status(201).json(createSuccessResponse(result, 'Registration successful'));
  } catch (error) {
    return next(error);
  }
});

authRouter.post('/login', validate(loginSchema), async (request, response, next) => {
  try {
    const result = await loginUser(request.body.email, request.body.password, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return response.json(createSuccessResponse(result, 'Login successful'));
  } catch (error) {
    return next(error);
  }
});

authRouter.get('/me', requireAuth, async (request, response, next) => {
  try {
    const user = await getCurrentUser(request.auth!.userId);
    return response.json(createSuccessResponse(user));
  } catch (error) {
    return next(error);
  }
});
