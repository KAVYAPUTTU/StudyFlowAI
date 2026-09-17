import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './db/mongoose.js';
import { startWorker, stopWorker } from './workers/worker.js';
async function start() {
  await connectDB();
 
  startWorker();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

async function shutdown() {

  stopWorker();

  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});