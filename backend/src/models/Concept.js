import mongoose from 'mongoose';


const conceptSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true, trim: true },
    summary: { type: String, default: '' },
    source: {
      material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
      page: { type: Number },
    },
  },
  { timestamps: true },
);

conceptSchema.index({ project: 1, name: 1 }, { unique: true });

export const Concept = mongoose.model('Concept', conceptSchema);