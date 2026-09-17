import { Router } from 'express';

import authRoutes from './auth.routes.js';
import healthRoutes from './health.routes.js';
import projectRoutes from './project.routes.js';
import spaceRoutes from './space.routes.js';
import materialRoutes from './material.routes.js';
import tutorRoutes from './tutor.routes.js';

const apiRouter = Router();

apiRouter.use(healthRoutes); // GET /api/health
apiRouter.use('/auth', authRoutes);
apiRouter.use('/spaces', spaceRoutes);
apiRouter.use('/projects', projectRoutes);
apiRouter.use('/', materialRoutes);
apiRouter.use('/', tutorRoutes); 

export default apiRouter;