import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    goal: { type: String, required: true }, 
  },
  { timestamps: true },
);

export const Project = mongoose.model('Project', projectSchema);