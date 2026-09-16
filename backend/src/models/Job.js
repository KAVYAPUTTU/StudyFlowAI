import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['process_material', 'grade_quiz', 'update_recommendations'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    error: { type: String, default: '' },
    availableAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const Job = mongoose.model('Job', jobSchema);