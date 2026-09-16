import mongoose from 'mongoose';


const spaceSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    color: { type: String, default: '#6366f1' }, 
  },
  { timestamps: true },
);

export const Space = mongoose.model('Space', spaceSchema);