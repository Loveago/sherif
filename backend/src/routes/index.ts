import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { agentRouter } from './agent.routes.js';
import { adminRouter } from './admin.routes.js';
import { webhookRouter } from './webhook.routes.js';
import { createSuccessResponse } from '../utils/response.js';

export const apiRouter = Router();

apiRouter.get('/health', (_request, response) => {
  return response.json(createSuccessResponse({ status: 'ok' }, 'DATAHUB Ghana API is healthy'));
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/', agentRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/', webhookRouter);
