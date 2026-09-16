import { Router } from 'express';

import { deleteProject, getProject, updateProject } from '../controllers/project.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/:id', getProject);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;