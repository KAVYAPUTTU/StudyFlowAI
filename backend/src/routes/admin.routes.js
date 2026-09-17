import { Router } from 'express';

import { overview, userDetail } from '../controllers/admin.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';

const router = Router();

router.get('/overview', requireAuth, requireAdmin, overview);
router.get('/users/:id', requireAuth, requireAdmin, userDetail);

export default router;