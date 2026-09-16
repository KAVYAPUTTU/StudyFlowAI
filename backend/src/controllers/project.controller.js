import {
  ActivityEvent, Chunk, Concept, LearningContext, Mastery,
  Material, Message, Project, Quiz, Recommendation, Space,
} from '../models/index.js';
import { ApiError } from '../utils/apiError.js';

async function findOwnedSpace(id, userId) {
  const space = await Space.findOne({ _id: id, owner: userId });
  if (!space) {
    throw new ApiError(404, 'Space not found');
  }
  return space;
}

// Same isolation rule as Spaces: ownership is part of the query.
async function findOwnedProject(id, userId) {
  const project = await Project.findOne({ _id: id, owner: userId });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }
  return project;
}

export async function listProjects(req, res) {
  const space = await findOwnedSpace(req.params.spaceId, req.user._id);
  const projects = await Project.find({ space: space._id }).sort({ createdAt: -1 });

  res.json({ space, projects });
}

export async function createProject(req, res) {
  const { name, description = '', goal } = req.body ?? {};
  if (!name?.trim() || !goal?.trim()) {
    throw new ApiError(400, 'Project name and learning goal are required');
  }

  const space = await findOwnedSpace(req.params.spaceId, req.user._id);

  const project = await Project.create({
    space: space._id,
    owner: req.user._id,
    name: name.trim(),
    description,
    goal: goal.trim(),
  });

  ActivityEvent.log({
    user: req.user._id,
    project: project._id,
    type: 'project_created',
    payload: { projectId: project._id, name: project.name, spaceId: space._id },
  });

  res.status(201).json({ project });
}

export async function getProject(req, res) {
  const project = await findOwnedProject(req.params.id, req.user._id);

  res.json({ project });
}

const EDITABLE_FIELDS = ['name', 'description', 'goal'];

export async function updateProject(req, res) {
  const project = await findOwnedProject(req.params.id, req.user._id);

  for (const field of EDITABLE_FIELDS) {
    if (req.body?.[field] !== undefined) {
      project[field] = req.body[field];
    }
  }
  await project.save();

  res.json({ project });
}

// Removes a Project and every document scoped to it. Complete deletion
// is part of data isolation — nothing may outlive its Project.
export async function deleteProjectData(projectId) {
  await Promise.all([
    Material.deleteMany({ project: projectId }),
    Chunk.deleteMany({ project: projectId }),
    Concept.deleteMany({ project: projectId }),
    Mastery.deleteMany({ project: projectId }),
    Quiz.deleteMany({ project: projectId }),
    Recommendation.deleteMany({ project: projectId }),
    Message.deleteMany({ project: projectId }),
    LearningContext.deleteMany({ project: projectId }),
  ]);
  await Project.deleteOne({ _id: projectId });
}

export async function deleteProject(req, res) {
  const project = await findOwnedProject(req.params.id, req.user._id);

  await deleteProjectData(project._id);

  res.json({ ok: true });
}