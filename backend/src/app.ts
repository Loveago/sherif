import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { originProtection } from './middleware/origin-protection.js';
import { apiRouter } from './routes/index.js';

export const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [env.FRONTEND_URL, 'http://127.0.0.1:3000', 'http://localhost:3000'];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: false,
  }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
  }),
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(originProtection);
app.use('/api/v1', apiRouter);
app.use(errorHandler);
