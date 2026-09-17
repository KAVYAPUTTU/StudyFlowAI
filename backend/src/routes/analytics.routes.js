import { Router } from 'express';

import {
  globalAnalytics,
  homeDashboard,
  projectAnalytics,
  projectGrowth,
  projectRecommendations,
} from '../controllers/analytics.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/home', requireAuth, homeDashboard);
router.get('/analytics/global', requireAuth, globalAnalytics);
router.get('/projects/:id/growth', requireAuth, projectGrowth);
router.get('/projects/:id/analytics', requireAuth, projectAnalytics);
router.get('/projects/:id/recommendations', requireAuth, projectRecommendations);

export default router;