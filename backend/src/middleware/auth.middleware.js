import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';

// Verifies the Bearer token and attaches the fresh user document to req.user.
// The DB lookup costs one query per request but guarantees a revoked or
// deleted user cannot keep using an old token.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      throw new ApiError(401, 'Authentication required');
    }

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch {
      throw new ApiError(401, 'Invalid or expired token');
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      throw new ApiError(401, 'User no longer exists');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}