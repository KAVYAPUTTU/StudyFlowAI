import { Router } from 'express';

import { createProject, listProjects } from '../controllers/project.controller.js';
import {
  createSpace, deleteSpace, getSpace, listSpaces, updateSpace,
} from '../controllers/space.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Every route below requires a valid token.
router.use(requireAuth);

router.get('/', listSpaces);
router.post('/', createSpace);
router.get('/:id', getSpace);
router.patch('/:id', updateSpace);
router.delete('/:id', deleteSpace);

// Projects live inside their Space; both stay scoped to the owner.
router.post('/:spaceId/projects', createProject);
router.get('/:spaceId/projects', listProjects);

export default router;