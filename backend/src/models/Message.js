import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['user', 'tutor'], required: true },
    content: { type: String, required: true },
    citations: [
      {
        material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
        materialName: { type: String },
        page: { type: Number },
        snippet: { type: String }, // the retrieved text that supports the answer
      },
    ],
    insufficientEvidence: { type: Boolean, default: false }, // tutor refused: not in material
  },
  { timestamps: true },
);

export const Message = mongoose.model('Message', messageSchema);