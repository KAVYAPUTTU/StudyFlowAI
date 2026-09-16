import mongoose from 'mongoose';


const chunkSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true, index: true },
    page: { type: Number, required: true },
    position: { type: Number, required: true }, // order of the chunk within the document
    text: { type: String, required: true },
    embedding: { type: [Number], default: [] }, // cosine-similarity retrieval
  },
  { timestamps: true },
);

export const Chunk = mongoose.model('Chunk', chunkSchema);