import { answerAsTutor, embedQuery } from '../ai/gemini.js';
import { env } from '../config/env.js';
import { ActivityEvent, Concept, LearningContext, Message, Project } from '../models/index.js';
import { retrieveEvidence } from './retrieval.service.js';

const TOP_K = 5;              
const HISTORY_MESSAGES = 6;   
const SNIPPET_CHARS = 200;    


async function getOrCreateContext(project) {
  const existing = await LearningContext.findOne({ project: project._id });
  if (existing) return existing;

  const concepts = await Concept.find({ project: project._id }).select('name').limit(10).lean();
  const summary = concepts.length
    ? `${project.goal} Concepts introduced so far: ${concepts.map((c) => c.name).join(', ')}.`
    : `Working toward: ${project.goal}`;

  return LearningContext.create({ project: project._id, summary });
}

function buildCitations(matches, usedSources) {
  return usedSources
    .map((blockNumber) => matches[blockNumber - 1])
    .filter(Boolean)
    .map((match) => ({
      material: match.material?._id,
      materialName: match.material?.filename ?? 'Unknown material',
      page: match.page,
      snippet: match.text.slice(0, SNIPPET_CHARS),
    }));
}

// One Tutor turn: embed -> retrieve -> (gate) -> generate -> persist.
export async function askTutor({ project, user, question }, ai = { embedQuery, answerAsTutor }) {
  const context = { project: project._id, user: user._id };

  // 1. Understand the request: embed the question for vector search.
  const queryVector = await ai.embedQuery(question, context);

  // 2. Retrieve evidence — strictly scoped to this Project (isolation).
  const { matches, topScore } = await retrieveEvidence(project._id, queryVector, { topK: TOP_K });

  // 3. Deterministic gate: if even the best match is unrelated, refuse
  const hasEvidence = matches.length > 0 && topScore >= env.tutorMinSimilarity;

  const learning = await getOrCreateContext(project);
  const history = await Message.find({ project: project._id })
    .sort({ createdAt: -1 })
    .limit(HISTORY_MESSAGES)
    .lean();
  history.reverse();

  await Message.create({ project: project._id, user: user._id, role: 'user', content: question });

  let tutorMessage;
  if (!hasEvidence) {
    tutorMessage = await Message.create({
      project: project._id,
      user: user._id,
      role: 'tutor',
      content:
        "I couldn't find enough relevant content in this project's materials to answer that reliably. " +
        'Try asking about a topic from an uploaded document, or upload material that covers it — ' +
        "I'd rather say this than make something up.",
      insufficientEvidence: true,
    });
  } else {
    // 4. Generate a grounded, structured answer.
    const evidenceText = matches
      .map(
        (match, index) =>
          `[${index + 1}] Source: ${match.material?.filename ?? 'material'} — page ${match.page}\n${match.text}`,
      )
      .join('\n\n');
    const historyText = history
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n')
      .slice(0, 1500);

    const response = await ai.answerAsTutor(
      {
        goal: project.goal,
        learningSummary: learning.summary,
        historyText,
        evidenceText,
        question,
      },
      context,
    );

    // 5. Persist the turn with traceable citations.
    tutorMessage = await Message.create({
      project: project._id,
      user: user._id,
      role: 'tutor',
      content: response.answer,
      citations: buildCitations(matches, response.usedSources),
      insufficientEvidence: response.insufficientEvidence,
    });
  }

  ActivityEvent.log({
    user: user._id,
    project: project._id,
    type: 'tutor_message',
    payload: { messageId: tutorMessage._id, insufficientEvidence: tutorMessage.insufficientEvidence, topScore },
  });

  return { tutorMessage, topScore };
}