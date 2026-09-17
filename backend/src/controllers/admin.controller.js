import {
  ActivityEvent,
  AICall,
  Job,
  Material,
  Project,
  Quiz,
  Space,
  User,
} from '../models/index.js';
import { ApiError } from '../utils/apiError.js';

// GET /api/admin/overview — platform-wide view (PRD §16 Admin Dashboard).
export async function overview(req, res) {
  const [users, spaces, projects, materials, quizzesCompleted, eventCounts, aiByFeature, failedJobs, recentUsers] =
    await Promise.all([
      User.countDocuments(),
      Space.countDocuments(),
      Project.countDocuments(),
      Material.countDocuments(),
      Quiz.countDocuments({ status: 'completed' }),
      ActivityEvent.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      AICall.aggregate([
        {
          $group: {
            _id: '$feature',
            calls: { $sum: 1 },
            failures: { $sum: { $cond: ['$success', 0, 1] } },
            avgLatencyMs: { $avg: '$latencyMs' },
            inputTokens: { $sum: '$inputTokens' },
            outputTokens: { $sum: '$outputTokens' },
          },
        },
        { $sort: { calls: -1 } },
      ]),
      Job.find({ status: 'failed' }).sort({ updatedAt: -1 }).limit(5).lean(),
      User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt').lean(),
    ]);

  res.json({
    totals: { users, spaces, projects, materials, quizzesCompleted },
    eventCounts,
    aiUsage: aiByFeature.map((row) => ({
      feature: row._id,
      calls: row.calls,
      failures: row.failures,
      avgLatencyMs: Math.round(row.avgLatencyMs ?? 0),
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
    })),
    failedJobs: failedJobs.map((job) => ({
      id: job._id,
      type: job.type,
      error: job.error.slice(0, 120),
      attempts: job.attempts,
      at: job.updatedAt,
    })),
    recentUsers,
  });
}

// GET /api/admin/users/:id — inspect one user's learning journey.
export async function userDetail(req, res) {
  const user = await User.findById(req.params.id).select('name email role createdAt');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const projects = await Project.find({ owner: user._id }).sort({ createdAt: -1 }).lean();
  const [eventCount, aiCalls] = await Promise.all([
    ActivityEvent.countDocuments({ user: user._id }),
    AICall.countDocuments({ user: user._id }),
  ]);
  const recentEvents = await ActivityEvent.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  res.json({
    user,
    projects: projects.map((project) => ({ id: project._id, name: project.name, goal: project.goal, createdAt: project.createdAt })),
    activity: { eventCount, aiCalls, recentEvents },
  });
}