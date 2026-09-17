import { Router } from 'express';

import { active, answer, complete, start } from '../controllers/quiz.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/projects/:id/quiz', requireAuth, start);
router.get('/projects/:id/quiz/active', requireAuth, active);
router.post('/projects/:id/quiz/:quizId/answers', requireAuth, answer);
router.post('/projects/:id/quiz/:quizId/complete', requireAuth, complete);

export default router;