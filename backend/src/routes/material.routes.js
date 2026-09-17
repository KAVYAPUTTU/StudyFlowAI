import multer from 'multer';
import { Router } from 'express';

import {
  deleteMaterial,
  listMaterials,
  MAX_UPLOAD_BYTES,
  uploadMaterial,
} from '../controllers/material.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { ApiError } from '../utils/apiError.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, callback) => {
    if (file.mimetype === 'application/pdf') {
      callback(null, true);
    } else {
      callback(new ApiError(400, 'Only PDF files are allowed'));
    }
  },
});

// Everything is scoped to a project the caller must own.
router.post('/projects/:id/materials', requireAuth, upload.single('file'), uploadMaterial);
router.get('/projects/:id/materials', requireAuth, listMaterials);
router.delete('/materials/:id', requireAuth, deleteMaterial);

export default router;