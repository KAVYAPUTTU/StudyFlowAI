import mongoose from 'mongoose';

// A suggested next learning action, generated from the learner's state.
const recommendationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['review', 'practice', 'quiz', 'material'],
      default: 'practice',
    },
    concept: { type: String },        // optional focus concept
    message: { type: String, required: true }, // the action, in plain language
    reason: { type: String, default: '' },     // evidence behind the suggestion
    status: { type: String, enum: ['open', 'done', 'dismissed'], default: 'open' },
  },
  { timestamps: true },
);

export const Recommendation = mongoose.model('Recommendation', recommendationSchema);