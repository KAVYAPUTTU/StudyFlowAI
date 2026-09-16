import { ApiError } from '../utils/apiError.js';

export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler. Express 5 forwards rejected async handlers here.
export function errorHandler(error, req, res, next) {
  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: error.message });
  }

  // Mongoose schema validation -> 400
  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors)
      .map((e) => e.message)
      .join(', ');
    return res.status(400).json({ error: details });
  }

  // Duplicate unique key -> 409
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {}).join(', ') || 'unique field';
    return res.status(409).json({ error: `Duplicate value for: ${field}` });
  }

  // Invalid ObjectId -> 400
  if (error.name === 'CastError') {
    return res.status(400).json({ error: `Invalid value for: ${error.path}` });
  }

  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
}