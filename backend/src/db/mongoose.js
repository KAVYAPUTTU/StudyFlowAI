import mongoose from 'mongoose';

import { env } from '../config/env.js';

export async function connectDB() {
  mongoose.connection.on('connected', () => console.log('MongoDB connected'));
  mongoose.connection.on('error', (error) => console.error('MongoDB error:', error.message));

  await mongoose.connect(env.mongoUri);
}

export async function disconnectDB() {
  await mongoose.disconnect();
}