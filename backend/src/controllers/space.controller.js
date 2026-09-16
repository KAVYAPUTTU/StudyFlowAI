import { deleteProjectData } from './project.controller.js';
import { ActivityEvent, Project, Space } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';


async function findOwnedSpace(id, userId) {
  const space = await Space.findOne({ _id: id, owner: userId });
  if (!space) {
    throw new ApiError(404, 'Space not found');
  }
  return space;
}

export async function listSpaces(req, res) {
  const spaces = await Space.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean();

  const counts = await Project.aggregate([
    { $match: { owner: req.user._id } },
    { $group: { _id: '$space', projectCount: { $sum: 1 } } },
  ]);
  const countBySpace = new Map(counts.map((count) => [count._id.toString(), count.projectCount]));

  res.json({
    spaces: spaces.map((space) => ({
      ...space,
      projectCount: countBySpace.get(space._id.toString()) ?? 0,
    })),
  });
}

export async function createSpace(req, res) {
  const { name, description = '', color } = req.body ?? {};
  if (!name?.trim()) {
    throw new ApiError(400, 'Space name is required');
  }

  const space = await Space.create({
    owner: req.user._id,
    name: name.trim(),
    description,
    ...(color ? { color } : {}),
  });

  ActivityEvent.log({
    user: req.user._id,
    type: 'space_created',
    payload: { spaceId: space._id, name: space.name },
  });

  res.status(201).json({ space });
}

export async function getSpace(req, res) {
  const space = await findOwnedSpace(req.params.id, req.user._id);
  const projects = await Project.find({ space: space._id }).sort({ createdAt: -1 });

  res.json({ space, projects });
}

const EDITABLE_FIELDS = ['name', 'description', 'color'];

export async function updateSpace(req, res) {
  const space = await findOwnedSpace(req.params.id, req.user._id);

  for (const field of EDITABLE_FIELDS) {
    if (req.body?.[field] !== undefined) {
      space[field] = req.body[field];
    }
  }
  await space.save();

  res.json({ space });
}

export async function deleteSpace(req, res) {
  const space = await findOwnedSpace(req.params.id, req.user._id);

  const projects = await Project.find({ space: space._id }).select('_id');
  for (const project of projects) {
    await deleteProjectData(project._id);
  }
  await space.deleteOne();

  res.json({ ok: true });
}