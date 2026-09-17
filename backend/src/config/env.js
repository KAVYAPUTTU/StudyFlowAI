import 'dotenv/config';

function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

export const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 4000,
    mongoUri: required('MONGODB_URI'),
    jwtSecret: required('JWT_SECRET'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    jobRetryDelayMs: Number(process.env.JOB_RETRY_DELAY_MS) || 30_000, // backoff between job attempts
    geminiTextModel: process.env.GEMINI_TEXT_MODEL || 'gemini-3.6-flash',
    geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
    tutorMinSimilarity: Number(process.env.TUTOR_MIN_SIMILARITY) || 0.3, // below this = not enough evidence
};