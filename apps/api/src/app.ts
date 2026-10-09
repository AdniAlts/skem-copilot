import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';

import { API_PREFIX } from '@skem/shared';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { meRouter } from './routes/me';
import { errorHandler } from './middleware/error';

export function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(API_PREFIX, healthRouter);
  app.use(API_PREFIX, authRouter);
  app.use(API_PREFIX, meRouter);
  app.use(errorHandler);
  return app;
}
