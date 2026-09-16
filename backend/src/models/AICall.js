import mongoose from 'mongoose';

// Observability record: one row per AI provider call.
// Answers "which model, how slow, how expensive, did it fail?".
const aiCallSchema = new mongoose.Schema(
  {
    feature: {
      type: String,
      enum: [
        'tutor',
        'quiz_generation',
        'answer_grading',
        'embedding',
        'document_processing',
        'recommendation',
        'evaluation',
      ],
      required: true,
      index: true,
    },
    model: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    latencyMs: { type: Number, required: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    success: { type: Boolean, required: true },
    error: { type: String, default: '' },
  },
  { timestamps: true },
);

export const AICall = mongoose.model('AICall', aiCallSchema);