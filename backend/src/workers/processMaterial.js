import { PDFParse } from 'pdf-parse';

import { embedTexts, extractConcepts } from '../ai/gemini.js';
import { Chunk, Concept, Mastery, Material, Project } from '../models/index.js';
import { chunkPages } from '../utils/chunker.js';

// How much of the document the concept extractor sees (keeps prompts small).
const CONCEPT_SAMPLE_CHARS = 6000;

async function extractPdfPages(buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return { pages: result.pages, total: result.total };
  } finally {
    await parser.destroy(); // release the pdf.js document
  }
}

// Full document pipeline. `ai` is injectable so tests can run the whole
// pipeline without API keys (dependency seam).
export async function processMaterial(materialId, ai = { embedTexts, extractConcepts }) {
  const material = await Material.findById(materialId).select('+data');
  if (!material) throw new Error(`Material ${materialId} not found`);

  // The learning goal lives on the Project and steers concept extraction.
  const project = await Project.findById(material.project).select('goal owner');
  if (!project) throw new Error(`Project ${material.project} not found`);

  const context = { project: material.project, user: material.uploadedBy };

  // 1. Parse PDF into per-page text.
  const { pages, total } = await extractPdfPages(material.data);
  if (total === 0) {
    throw new Error('No pages could be extracted (scanned PDF without a text layer?)');
  }

  // 2. Chunk pages, keeping page numbers for citations.
  const chunks = chunkPages(pages);
  if (chunks.length === 0) {
    throw new Error('Document contains no extractable text');
  }

  // 3. Embed all chunks in batches.
  const vectors = await ai.embedTexts(
    chunks.map((chunk) => chunk.text),
    context,
  );

  // 4. Persist chunks (replace any previous version — reprocessing is safe).
  await Chunk.deleteMany({ material: material._id });
  await Chunk.insertMany(
    chunks.map((chunk, position) => ({
      project: material.project,
      material: material._id,
      page: chunk.page,
      position,
      text: chunk.text,
      embedding: vectors[position] ?? [],
    })),
  );

  // 5. Extract concepts and initialize mastery tracking (idempotent).
  const concepts = await ai.extractConcepts(
    {
      goal: project.goal,
      sampleText: chunks
        .slice(0, 6)
        .map((chunk) => `[page ${chunk.page}] ${chunk.text}`)
        .join('\n')
        .slice(0, CONCEPT_SAMPLE_CHARS),
    },
    context,
  );

  for (const concept of concepts) {
    const document = await Concept.findOneAndUpdate(
      { project: material.project, name: concept.name },
      {
        $set: { summary: concept.summary, source: { material: material._id, page: concept.sourcePage } },
        $setOnInsert: { project: material.project, name: concept.name },
      },
      { upsert: true, new: true },
    );

    await Mastery.updateOne(
      { project: material.project, concept: document._id },
      { $setOnInsert: { level: 0, history: [{ level: 0 }] } },
      { upsert: true },
    );
  }

  // 6. Done.
  material.status = 'ready';
  material.pageCount = total;
  material.error = '';
  await material.save();

  return { pages: total, chunks: chunks.length, concepts: concepts.length };
}