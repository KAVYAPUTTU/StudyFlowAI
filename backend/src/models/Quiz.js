import mongoose from 'mongoose';

// The answer a user gives to one question, plus the AI evaluation of it.
const answerSchema = new mongoose.Schema(
  {
    selectedOption: { type: Number }, // MCQ: index of the chosen option
    textAnswer: { type: String },     // open-ended: what the user wrote
    score: { type: Number, min: 0, max: 100 },
    feedback: { type: String },       // AI explanation: what was understood / missing
    understood: { type: [String], default: [] },
    missed: { type: [String], default: [] },
    answeredAt: { type: Date },
  },
  { _id: false },
);

// Reference back to the material the question was grounded in.
const sourceRefSchema = new mongoose.Schema(
  {
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
    page: { type: Number },
  },
  { _id: false },
);

const questionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['mcq', 'open'], required: true },
    concept: { type: String, required: true }, // concept name this question tests
    difficulty: { type: Number, min: 1, max: 5, default: 3 },
    prompt: { type: String, required: true },
    options: { type: [String], default: [] },  // MCQ only
    correctIndex: { type: Number },            // MCQ only
    keyPoints: { type: [String], default: [] },// open-ended grading rubric
    source: { type: sourceRefSchema, default: () => ({}) },
    answer: { type: answerSchema, default: () => ({}) },
  },
  { timestamps: true },
);

const quizSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['generating', 'active', 'completed', 'failed'],
      default: 'generating',
      index: true,
    },
    targetConcepts: { type: [String], default: [] },
    questions: { type: [questionSchema], default: [] },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

export const Quiz = mongoose.model('Quiz', quizSchema);