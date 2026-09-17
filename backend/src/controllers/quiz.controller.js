import { Project, Quiz } from '../models/index.js';
import { completeQuiz, startQuiz, submitAnswer } from '../services/quiz.service.js';
import { ApiError } from '../utils/apiError.js';

async function findOwnedProject(id, userId) {
  const project = await Project.findOne({ _id: id, owner: userId });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }
  return project;
}

// The client must never see correctIndex/keyPoints while a quiz is active —
// they are revealed per question once answered, and fully when completed.
function toClientQuestion(question, reveal) {
  return {
    id: question._id,
    type: question.type,
    concept: question.concept,
    difficulty: question.difficulty,
    prompt: question.prompt,
    options: question.options,
    answeredAt: question.answer?.answeredAt ?? null,
    answer: question.answer?.answeredAt
      ? {
          score: question.answer.score,
          feedback: question.answer.feedback,
          understood: question.answer.understood,
          missed: question.answer.missed,
          selectedOption: question.answer.selectedOption,
          textAnswer: question.answer.textAnswer,
        }
      : null,
    correctIndex: reveal || question.answer?.answeredAt ? question.correctIndex : undefined,
    keyPoints: reveal ? question.keyPoints : undefined,
    source: { page: question.source?.page },
  };
}

function toClientQuiz(quiz, reveal = false) {
  return {
    id: quiz._id,
    status: quiz.status,
    targetConcepts: quiz.targetConcepts,
    startedAt: quiz.startedAt,
    completedAt: quiz.completedAt,
    questions: quiz.questions.map((question) => toClientQuestion(question, reveal)),
  };
}

export async function start(req, res) {
  const project = await findOwnedProject(req.params.id, req.user._id);
  const { quiz } = await startQuiz({ project, user: req.user });

  res.status(201).json({ quiz: toClientQuiz(quiz) });
}

export async function active(req, res) {
  const project = await findOwnedProject(req.params.id, req.user._id);

  const quiz = await Quiz.findOne({ project: project._id, status: 'active' });
  res.json({ quiz: quiz ? toClientQuiz(quiz) : null });
}

export async function answer(req, res) {
  const project = await findOwnedProject(req.params.id, req.user._id);
  const { questionId, selectedOption, textAnswer } = req.body ?? {};

  const { question, answered, total } = await submitAnswer({
    project,
    user: req.user,
    quizId: req.params.quizId,
    questionId,
    selectedOption,
    textAnswer,
  });

  res.json({ question: toClientQuestion(question, false), answered, total });
}

export async function complete(req, res) {
  const project = await findOwnedProject(req.params.id, req.user._id);

  const summary = await completeQuiz({
    project,
    user: req.user,
    quizId: req.params.quizId,
  });

  const quiz = await Quiz.findById(req.params.quizId);
  res.json({ ...summary, quiz: toClientQuiz(quiz, true) });
}