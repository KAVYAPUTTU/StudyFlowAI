export function chunkPages(pages, { maxChars = 1200, overlap = 150 } = {}) {
  const chunks = [];

  for (const page of pages) {
    const text = page.text.replace(/\s+/g, ' ').trim();
    if (!text) continue; // blank page / scanned page without text layer

    let start = 0;
    while (start < text.length) {
      chunks.push({ page: page.num, text: text.slice(start, start + maxChars) });
      if (start + maxChars >= text.length) break;
      start += maxChars - overlap;
    }
  }

  return chunks; // [{ page, text }] — position is assigned when inserting
}