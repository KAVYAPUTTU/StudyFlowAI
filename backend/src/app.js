import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import apiRouter from './routes/index.js';

export function createApp() {
  const app = express();

  app.use(helmet());
app.use(cors({ origin: env.corsOrigins.includes('*') ? '*' : env.corsOrigins }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}