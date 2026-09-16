import { Router } from 'express';

import authRoutes from './auth.routes.js';
import healthRoutes from './health.routes.js';
import projectRoutes from './project.routes.js';
import spaceRoutes from './space.routes.js';

const apiRouter = Router();

apiRouter.use(healthRoutes); // GET /api/health
apiRouter.use('/auth', authRoutes);
apiRouter.use('/spaces', spaceRoutes);
apiRouter.use('/projects', projectRoutes);

export default apiRouter;