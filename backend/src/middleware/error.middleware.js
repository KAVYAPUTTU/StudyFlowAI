import { ApiError } from '../utils/apiError.js';
import { MulterError } from 'multer';

export function notFound(req, res) {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler. Express 5 forwards rejected async handlers here.
export function errorHandler(error, req, res, next) {
    if (error instanceof MulterError) {
        const message =
            error.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 8MB)' : `Upload error: ${error.message}`;
        return res.status(400).json({ error: message });
    }
    const status = error.status;
    if (Number.isInteger(status) && status >= 400 && status < 500 && error.message) {
        return res.status(status).json({ error: error.message });
    }
    if (error.message?.includes('GEMINI_API_KEY')) {
        return res.status(503).json({ error: 'AI service is not configured' });
    }
    // Provider still busy after retries -> client-friendly 503, not a 500
    if (error.status === 429 || error.status === 503 || /high demand|overloaded/i.test(error.message ?? '')) {
        return res.status(503).json({ error: 'The AI service is busy right now. Please try again in a moment.' });
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