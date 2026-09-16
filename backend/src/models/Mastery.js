import mongoose from 'mongoose';

const masterySchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    concept: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept', required: true, index: true },
    level: { type: Number, min: 0, max: 100, default: 0 },
    history: [
      {
        level: { type: Number, min: 0, max: 100 },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

masterySchema.index({ project: 1, concept: 1 }, { unique: true });

export const Mastery = mongoose.model('Mastery', masterySchema);