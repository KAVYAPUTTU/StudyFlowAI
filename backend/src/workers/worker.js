import { env } from '../config/env.js';
import { ActivityEvent, Job, Material } from '../models/index.js';
import { processMaterial } from './processMaterial.js';

const POLL_INTERVAL_MS = 2_000;

const HANDLERS = {
  process_material: (payload) => processMaterial(payload.materialId),
};

let timer = null;

// Claims the oldest due queued job. The conditional findOneAndUpdate makes
// the claim atomic: two workers can never take the same job.
async function claimJob() {
  return Job.findOneAndUpdate(
    { status: 'queued', availableAt: { $lte: new Date() } },
    { $set: { status: 'processing' }, $inc: { attempts: 1 } },
    { new: true, sort: { createdAt: 1 } },
  );
}

async function runJob(job) {
  const handler = HANDLERS[job.type];
  if (!handler) throw new Error(`No handler for job type: ${job.type}`);

  try {
    await handler(job.payload);
    await Job.updateOne({ _id: job._id }, { status: 'completed' });
  } catch (error) {
    const willRetry = job.attempts < job.maxAttempts;

    await Job.updateOne(
      { _id: job._id },
      {
        status: willRetry ? 'queued' : 'failed',
        error: error.message.slice(0, 500),
        ...(willRetry ? { availableAt: new Date(Date.now() + env.jobRetryDelayMs * job.attempts) } : {}),
      },
    );

    // Keep the user-visible material status in sync with the job.
    if (job.type === 'process_material') {
      await Material.updateOne(
        { _id: job.payload.materialId },
        willRetry
          ? { status: 'queued', error: `Attempt ${job.attempts} failed, retrying` }
          : { status: 'failed', error: error.message.slice(0, 500) },
      );
      if (!willRetry) {
        ActivityEvent.log({
          user: job.payload.userId,
          project: job.payload.projectId,
          type: 'material_failed',
          payload: { materialId: job.payload.materialId, reason: error.message.slice(0, 200) },
        }).catch(() => {});
      }
    }
  }
}

async function tick() {
  const job = await claimJob();
  if (!job) return;

  if (job.type === 'process_material') {
    await Material.updateOne({ _id: job.payload.materialId }, { status: 'processing' });
  }
  await runJob(job);
}

// Recovery: jobs stuck in `processing` (server crash/restart) go back to the
// queue so work is never silently lost.
async function recoverStaleJobs() {
  const result = await Job.updateMany(
    { status: 'processing' },
    { $set: { status: 'queued', availableAt: new Date() } },
  );
  if (result.modifiedCount > 0) {
    console.log(`Worker: recovered ${result.modifiedCount} stale job(s)`);
  }
}

export function startWorker() {
  recoverStaleJobs().catch((error) => console.error('Worker recovery failed:', error.message));
  timer = setInterval(() => {
    tick().catch((error) => console.error('Worker tick failed:', error.message));
  }, POLL_INTERVAL_MS);
  console.log('Background worker started');
}

export function stopWorker() {
  if (timer) clearInterval(timer);
}