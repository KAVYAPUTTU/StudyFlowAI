import mongoose from 'mongoose';


const learningContextSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      unique: true,
    },
    summary: { type: String, default: '' },         
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    repeatedMistakes: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const LearningContext = mongoose.model('LearningContext', learningContextSchema);