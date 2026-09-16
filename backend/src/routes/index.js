import { Router } from 'express';

import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';

const apiRouter = Router();

apiRouter.use(healthRoutes); // GET /api/health
apiRouter.use('/auth', authRoutes);

export default apiRouter;