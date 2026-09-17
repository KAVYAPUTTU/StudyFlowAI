import { ApiError } from '../utils/apiError.js';

// Must run AFTER requireAuth: only admins pass.
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    next(new ApiError(403, 'Admin access required'));
    return;
  }
  next();
}