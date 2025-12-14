// Lightweight text chunker for workspace knowledge.
// Splits by paragraphs/headings first, then wraps to a target size with overlap
// to preserve context. Keeps markdown headings intact to help change-impact prompts.
export function chunkText(rawText, opts = {}) {
  const maxChars = Number(opts.maxChars) || 1200;
  const overlapChars = Number(opts.overlapChars) || 120;
  const normalized = String(rawText || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n\s*\n/);
  const chunks = [];

  for (const para of paragraphs) {
    const segment = para.trim();
    if (!segment) continue;

    let cursor = 0;
    while (cursor < segment.length) {
      const window = segment.slice(cursor, cursor + maxChars);
      let end = cursor + window.length;

      // Prefer to break on a newline or sentence boundary inside the window
      if (window.length === maxChars && cursor + maxChars < segment.length) {
        const lastNewline = window.lastIndexOf("\n");
        const lastSentence = window.lastIndexOf(". ");
        const cutoff = Math.max(lastNewline, lastSentence);
        if (cutoff > maxChars * 0.5) {
          end = cursor + cutoff + 1;
        }
      }

      const chunkBody = segment.slice(cursor, end).trim();
      if (chunkBody) {
        const headingMatch = chunkBody.match(/^(#+\s+.+)$/m);
        const heading = headingMatch ? headingMatch[1].replace(/^#+\s*/, "").trim() : null;
        chunks.push({
          text: chunkBody,
          tokensApprox: Math.max(1, Math.ceil(chunkBody.length / 4)),
          metadata: heading ? { heading } : {},
        });
      }

      cursor = Math.max(end - overlapChars, cursor + maxChars);
    }
  }

  return chunks;
}
