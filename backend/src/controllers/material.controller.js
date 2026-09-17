import { ActivityEvent, Chunk, Job, Material, Project } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB — fits the Mongo 16MB doc limit

async function findOwnedProject(id, userId) {
  const project = await Project.findOne({ _id: id, owner: userId });
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }
  return project;
}

async function findOwnedMaterial(id, userId) {
  const material = await Material.findOne({ _id: id, uploadedBy: userId });
  if (!material) {
    throw new ApiError(404, 'Material not found');
  }
  return material;
}

// The PDF arrives in memory (multer). We persist it with the Material and
// enqueue processing — responding immediately, never blocking the user.
export async function uploadMaterial(req, res) {
  const project = await findOwnedProject(req.params.id, req.user._id);

  if (!req.file) {
    throw new ApiError(400, 'A PDF file is required (field name: "file")');
  }

  // The MIME type is declared by the client and can be lied about —
  // verify the actual bytes start with the PDF signature.
  if (!req.file.buffer.subarray(0, 5).toString('latin1').startsWith('%PDF-')) {
    throw new ApiError(400, 'File content is not a valid PDF');
  }

  const material = await Material.create({
    project: project._id,
    uploadedBy: req.user._id,
    filename: req.file.originalname,
    data: req.file.buffer,
  });

  await Job.create({
    type: 'process_material',
    payload: { materialId: material._id, projectId: project._id, userId: req.user._id },
  });

  ActivityEvent.log({
    user: req.user._id,
    project: project._id,
    type: 'material_uploaded',
    payload: { materialId: material._id, filename: material.filename },
  });

  const view = await Material.findById(material._id).select('-data');
  res.status(202).json({ material: view }); // 202: accepted, processing continues async
}

export async function listMaterials(req, res) {
  const project = await findOwnedProject(req.params.id, req.user._id);

  const materials = await Material.find({ project: project._id })
    .select('-data')
    .sort({ createdAt: -1 });

  res.json({ materials });
}

export async function deleteMaterial(req, res) {
  const material = await findOwnedMaterial(req.params.id, req.user._id);

  await Chunk.deleteMany({ material: material._id });
  await material.deleteOne();

  res.json({ ok: true });
}