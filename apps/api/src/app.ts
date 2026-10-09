import express, { type Express } from 'express';
import { API_PREFIX } from '@skem/shared';
import { healthRouter } from './routes/health';

export function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(API_PREFIX, healthRouter);
  return app;
}
