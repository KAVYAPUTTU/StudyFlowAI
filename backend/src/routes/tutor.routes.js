import { Router } from 'express';

import { getMessages, postMessage } from '../controllers/tutor.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/projects/:id/tutor', requireAuth, postMessage);
router.get('/projects/:id/tutor/messages', requireAuth, getMessages);

export default router;