import { Message, Project } from '../models/index.js';
import { askTutor } from '../services/tutor.service.js';
import { ApiError } from '../utils/apiError.js';

const MAX_QUESTION_CHARS = 2000;

async function findOwnedProject(id, userId) {
  const project = await Project.findOne({ _id: id, owner: userId });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }
  return project;
}

export async function postMessage(req, res) {
  const project = await findOwnedProject(req.params.id, req.user._id);

  const { question } = req.body ?? {};
  if (!question?.trim()) {
    throw new ApiError(400, 'question is required');
  }
  if (question.length > MAX_QUESTION_CHARS) {
    throw new ApiError(400, `question is too long (max ${MAX_QUESTION_CHARS} characters)`);
  }

  const { tutorMessage } = await askTutor({ project, user: req.user, question: question.trim() });

  res.json({ tutorMessage });
}

export async function getMessages(req, res) {
  const project = await findOwnedProject(req.params.id, req.user._id);

  // Latest page of the conversation, returned in chronological order.
  const messages = await Message.find({ project: project._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .select('-user -project')
    .lean();
  messages.reverse();

  res.json({ messages });
}