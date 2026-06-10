import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (request: Request, response: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: request.body,
      query: request.query,
      params: request.params,
    });

    if (!result.success) {
      return response.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.error.flatten(),
      });
    }

    request.body = result.data.body;
    request.query = result.data.query;
    request.params = result.data.params;

    return next();
  };
};
