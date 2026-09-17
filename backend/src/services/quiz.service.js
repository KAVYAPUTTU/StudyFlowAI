import { embedQueries, generateQuiz, gradeOpenAnswer } from '../ai/gemini.js';
import {
    ActivityEvent,
    LearningContext,
    Mastery,
    Quiz,
    Recommendation,
} from '../models/index.js';
import { retrieveEvidence } from './retrieval.service.js';

const CONCEPTS_PER_QUIZ = 3;
const EVIDENCE_PER_CONCEPT = 2;
const WEAK_LEVEL = 50; // below this = weakness
const STRONG_LEVEL = 75; // above this = strength

function httpError(status, message) {
    return Object.assign(new Error(message), { status });
}

// ---- adaptive selection: weakest concepts first, from mastery evidence
async function selectTargetConcepts(projectId) {
    const rows = await Mastery.find({ project: projectId })
        .populate('concept', 'name summary')
        .lean();

    if (rows.length === 0) {
        throw httpError(400, 'Upload and process material first — quizzes are built from your documents');
    }

    return rows
        .sort((a, b) => a.level - b.level)
        .slice(0, CONCEPTS_PER_QUIZ)
        .map((row) => ({ oldLevel: row.level, name: row.concept.name, summary: row.concept.summary }));
}

// Ground each target concept in real material chunks (with page numbers).
async function buildConceptEvidence(projectId, targets, context, ai) {
    const vectors = await ai.embedQueries(
        targets.map((target) => `${target.name}. ${target.summary}`),
        context,
    );

    const blocks = [];
    for (let i = 0; i < targets.length; i += 1) {
        const { matches } = await retrieveEvidence(projectId, vectors[i], { topK: EVIDENCE_PER_CONCEPT });
        for (const match of matches) {
            blocks.push(`CONCEPT: ${targets[i].name} | Source page ${match.page}:\n${match.text}`);
        }
    }

    if (blocks.length === 0) {
        throw httpError(400, 'No processed material found to build questions from');
    }
    return blocks.join('\n\n');
}

// ---- start: select concepts, ground them, generate, persist
export async function startQuiz({ project, user }, ai = { embedQueries, generateQuiz }) {
    const context = { project: project._id, user: user._id };

    const active = await Quiz.findOne({ project: project._id, status: 'active' });
    if (active) {
        throw httpError(409, 'Finish your current quiz first');
    }

    const targets = await selectTargetConcepts(project._id);
    const conceptEvidence = await buildConceptEvidence(project._id, targets, context, ai);
    const masteryHint = targets.map((target) => `${target.name}: ${target.oldLevel}% mastery`).join(', ');

    const questions = await ai.generateQuiz({ goal: project.goal, conceptEvidence, masteryHint }, context);

    const quiz = await Quiz.create({
        project: project._id,
        user: user._id,
        status: 'active',
        targetConcepts: targets.map((target) => target.name),
        questions: questions.map(({ sourcePage, ...rest }) => ({ ...rest, source: { page: sourcePage ?? 1 } })),
        startedAt: new Date(),
    });

    ActivityEvent.log({
        user: user._id,
        project: project._id,
        type: 'quiz_started',
        payload: { quizId: quiz._id, concepts: quiz.targetConcepts },
    });

    return { quiz, targets };
}

// ---- one answer: MCQ graded locally, open-ended graded by the AI
export async function submitAnswer(
    { project, user, quizId, questionId, selectedOption, textAnswer },
    ai = { gradeOpenAnswer },
) {
    const context = { project: project._id, user: user._id };

    const quiz = await Quiz.findOne({ _id: quizId, project: project._id, user: user._id, status: 'active' });
    if (!quiz) {
        throw httpError(404, 'Active quiz not found');
    }

    const question = quiz.questions.id(questionId);
    if (!question) {
        throw httpError(404, 'Question not found in this quiz');
    }
    if (question.answer?.answeredAt) {
        throw httpError(409, 'Question already answered');
    }

    let evaluation;
    if (question.type === 'mcq') {
        if (!Number.isInteger(selectedOption)) {
            throw httpError(400, 'selectedOption is required for MCQ');
        }
        const correct = selectedOption === question.correctIndex;
        evaluation = {
            score: correct ? 100 : 0,
            feedback: correct
                ? 'Correct.'
                : `Not quite — the correct answer is "${question.options[question.correctIndex]}".`,
            understood: correct ? [question.concept] : [],
            missed: correct ? [] : [question.concept],
            selectedOption,
        };
    } else {
        if (!textAnswer?.trim()) {
            throw httpError(400, 'textAnswer is required for open questions');
        }
        evaluation = {
            ...(
                await ai.gradeOpenAnswer(
                    { prompt: question.prompt, keyPoints: question.keyPoints, answer: textAnswer.trim() },
                    context,
                )
            ),
            textAnswer: textAnswer.trim(),
        };
    }

    question.answer = { ...evaluation, answeredAt: new Date() };
    await quiz.save();

    const answered = quiz.questions.filter((q) => q.answer?.answeredAt).length;
    return { question, answered, total: quiz.questions.length };
}

// ---- complete: mastery blend, learning context, recommendation
export async function completeQuiz({ project, user, quizId }) {
    // Guarded transition: only an active quiz can complete (idempotent).
    const quiz = await Quiz.findOneAndUpdate(
        { _id: quizId, project: project._id, user: user._id, status: 'active' },
        { status: 'completed', completedAt: new Date() },
        { new: true },
    );
    if (!quiz) {
        throw httpError(409, 'Active quiz not found (already completed?)');
    }

    // Per-concept quiz performance.
    const byConcept = new Map();
    for (const question of quiz.questions) {
        if (!question.answer?.answeredAt) continue;
        const entry = byConcept.get(question.concept) ?? { total: 0, score: 0 };
        entry.total += 1;
        entry.score += question.answer.score;
        byConcept.set(question.concept, entry);
    }

    // Mastery is an estimate updated with new evidence: a 50/50 blend with
    // the quiz result, plus a history entry for growth-over-time.
    const masteryRows = await Mastery.find({ project: project._id }).populate('concept', 'name');
    const rowByName = new Map(masteryRows.map((row) => [row.concept.name, row]));

    const results = [];
    for (const [conceptName, { total, score }] of byConcept) {
        const row = rowByName.get(conceptName);
        if (!row) continue;

        const quizScore = Math.round(score / total);
        const oldLevel = row.level;
        const newLevel = Math.max(0, Math.min(100, Math.round(oldLevel * 0.5 + quizScore * 0.5)));

        row.level = newLevel;
        row.history.push({ level: newLevel });
        await row.save();

        results.push({ concept: conceptName, quizScore, oldLevel, newLevel });
    }

    // Refresh the persistent learning context from the latest evidence.
    const refreshed = await Mastery.find({ project: project._id }).populate('concept', 'name').lean();
    const weaknesses = refreshed.filter((row) => row.level < WEAK_LEVEL).map((row) => row.concept.name).slice(0, 5);
    const strengths = refreshed.filter((row) => row.level >= STRONG_LEVEL).map((row) => row.concept.name).slice(0, 5);

    // Upsert: the context may not exist yet if the user never used the Tutor.
    await LearningContext.updateOne(
        { project: project._id },
        { $set: { strengths, weaknesses } },
        { upsert: true },
    );

    // Rule-based recommendation from the weakest result: deterministic,
    // explainable, zero extra AI cost. LLM-personalized phrasing is a
    // documented future improvement.
    let recommendation = null;
    const weakest = [...results].sort((a, b) => a.quizScore - b.quizScore)[0];
    if (weakest && weakest.quizScore < 100) {
        await Recommendation.updateMany({ project: project._id, status: 'open' }, { status: 'dismissed' });
        recommendation = await Recommendation.create({
            project: project._id,
            user: user._id,
            type: weakest.quizScore < 50 ? 'review' : 'practice',
            concept: weakest.concept,
            message:
                weakest.quizScore < 50
                    ? `Review "${weakest.concept}" in your material, then take another short quiz to confirm it stuck.`
                    : `Good base in "${weakest.concept}" — practice one more application question to lock it in.`,
            reason: `Scored ${weakest.quizScore}% on it in this quiz.`,
        });

        ActivityEvent.log({
            user: user._id,
            project: project._id,
            type: 'recommendation_created',
            payload: { recommendationId: recommendation._id, concept: weakest.concept },
        });
    }

    ActivityEvent.log({
        user: user._id,
        project: project._id,
        type: 'quiz_completed',
        payload: { quizId: quiz._id, results },
    });

    return { results, weaknesses, strengths, recommendation };
}