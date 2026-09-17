import {
  ActivityEvent,
  Chunk,
  Concept,
  Mastery,
  Material,
  Project,
  Quiz,
  Recommendation,
  Space,
} from '../models/index.js';
import { ApiError } from '../utils/apiError.js';

const WEAK_LEVEL = 50;

function trend(level, history) {
  const previous = history.length > 1 ? history[history.length - 2].level : history[0]?.level ?? level;
  const delta = level - previous;
  if (level < WEAK_LEVEL) return { label: 'needs attention', delta };
  if (delta >= 3) return { label: 'improving', delta };
  return { label: 'stable', delta };
}

async function findOwnedProject(id, userId) {
  const project = await Project.findOne({ _id: id, owner: userId });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }
  return project;
}

// GET /api/projects/:id/growth — mastery trends over time (PRD §10).
export async function projectGrowth(req, res) {
  const project = await findOwnedProject(req.params.id, req.user._id);

  const rows = await Mastery.find({ project: project._id }).populate('concept', 'name').lean();
  const concepts = rows.map((row) => ({
    concept: row.concept.name,
    level: row.level,
    history: row.history.map((point) => ({ level: point.level, at: point.at })),
    trend: trend(row.level, row.history),
  }));

  res.json({
    concepts: concepts.sort((a, b) => a.level - b.level),
    averageLevel: concepts.length ? Math.round(concepts.reduce((sum, c) => sum + c.level, 0) / concepts.length) : 0,
  });
}

// GET /api/projects/:id/analytics — activity + performance summary (PRD §12).
export async function projectAnalytics(req, res) {
  const project = await findOwnedProject(req.params.id, req.user._id);

  const [materials, readyMaterials, chunks, concepts, quizzes, eventCounts, recentEvents] = await Promise.all([
    Material.countDocuments({ project: project._id }),
    Material.countDocuments({ project: project._id, status: 'ready' }),
    Chunk.countDocuments({ project: project._id }),
    Concept.countDocuments({ project: project._id }),
    Quiz.countDocuments({ project: project._id, status: 'completed' }),
    ActivityEvent.aggregate([
      { $match: { project: project._id } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    ActivityEvent.find({ project: project._id }).sort({ createdAt: -1 }).limit(15).lean(),
  ]);

  res.json({
    totals: { materials, readyMaterials, chunks, concepts, quizzesCompleted: quizzes },
    eventCounts,
    recentEvents: recentEvents.map((event) => ({
      id: event._id,
      type: event.type,
      at: event.createdAt,
      payload: event.payload,
    })),
  });
}

// GET /api/analytics/global — the user's learning across ALL projects.
export async function globalAnalytics(req, res) {
  const userId = req.user._id;

  const [spaces, projects, completedQuizzes, eventCounts, daily] = await Promise.all([
    Space.countDocuments({ owner: userId }),
    Project.countDocuments({ owner: userId }),
    Quiz.countDocuments({ user: userId, status: 'completed' }),
    ActivityEvent.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    ActivityEvent.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  res.json({ totals: { spaces, projects, completedQuizzes }, eventCounts, dailyActivity: daily });
}

// GET /api/home — "Where was I, how am I doing, what next?" (PRD §16).
export async function homeDashboard(req, res) {
  const userId = req.user._id;

  const masteryRows = await Mastery.find({}).populate('concept', 'name project').lean();
  const userProjectIds = new Set(
    (await Project.find({ owner: userId }).select('_id')).map((p) => p._id.toString()),
  );
  const ownMastery = masteryRows.filter((row) => userProjectIds.has(row.concept.project?.toString()));

  const averageMastery = ownMastery.length
    ? Math.round(ownMastery.reduce((sum, row) => sum + row.level, 0) / ownMastery.length)
    : 0;
  const attentionAreas = ownMastery
    .filter((row) => row.level < WEAK_LEVEL)
    .sort((a, b) => a.level - b.level)
    .slice(0, 3)
    .map((row) => ({ concept: row.concept.name, level: row.level }));

  const recentProjects = await Project.find({ owner: userId }).sort({ updatedAt: -1 }).limit(3).lean();
  const recommendations = await Recommendation.find({ user: userId, status: 'open' })
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  res.json({
    averageMastery,
    attentionAreas,
    recentProjects: recentProjects.map((project) => ({
      id: project._id,
      name: project.name,
      goal: project.goal,
      space: project.space,
    })),
    recommendations: recommendations.map((rec) => ({
      id: rec._id,
      message: rec.message,
      reason: rec.reason,
      concept: rec.concept,
      project: rec.project,
    })),
  });
}

// GET /api/projects/:id/recommendations
export async function projectRecommendations(req, res) {
  const project = await findOwnedProject(req.params.id, req.user._id);

  const recommendations = await Recommendation.find({ project: project._id, status: 'open' })
    .sort({ createdAt: -1 })
    .limit(5);

  res.json({ recommendations });
}