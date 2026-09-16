import mongoose from 'mongoose';


const materialSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    status: {
      type: String,
      enum: ['queued', 'processing', 'ready', 'failed'],
      default: 'queued',
      index: true,
    },
    pageCount: { type: Number, default: 0 },
    error: { type: String, default: '' }, 
  },
  { timestamps: true },
);

export const Material = mongoose.model('Material', materialSchema);