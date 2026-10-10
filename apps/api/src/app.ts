import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';

import { API_PREFIX } from '@skem/shared';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { meRouter } from './routes/me';
import { errorHandler } from './middleware/error';
import { batchesRouter } from './routes/batches';
import { submissionsRouter } from './routes/submissions';
import { verifierRouter } from './routes/verifier';
import { validatorRouter } from './routes/validator';

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(API_PREFIX, healthRouter);
  app.use(API_PREFIX, authRouter);
  app.use(API_PREFIX, meRouter);
  app.use(API_PREFIX, batchesRouter);
  app.use(API_PREFIX, submissionsRouter);
  app.use(API_PREFIX, verifierRouter);
  app.use(API_PREFIX, validatorRouter);
  app.use(errorHandler);
  return app;
}
