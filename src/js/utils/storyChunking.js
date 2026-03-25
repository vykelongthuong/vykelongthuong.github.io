const DEFAULT_CHUNK_THRESHOLD = 30000;
const DEFAULT_TARGET_CHUNK_SIZE = 15000;
const DEFAULT_MIN_CHUNK_SIZE = 14000;
const DEFAULT_MAX_CHUNK_SIZE = 16000;

function isBoundaryCharacter(char) {
  return /[\n\r.!?。！？…]/.test(char || "");
}

function findSplitIndex(text, start, options) {
  const { targetSize, minSize, maxSize } = options;
  const remaining = text.length - start;
  if (remaining <= maxSize) {
    return text.length;
  }

  const preferred = start + targetSize;
  const min = Math.max(start + minSize, start + 1);
  const max = Math.min(start + maxSize, text.length - 1);

  for (let i = preferred; i >= min; i -= 1) {
    if (isBoundaryCharacter(text[i - 1])) {
      return i;
    }
  }

  for (let i = preferred + 1; i <= max; i += 1) {
    if (isBoundaryCharacter(text[i - 1])) {
      return i;
    }
  }

  return preferred;
}

export function splitStoryIntoChunks(text, options = {}) {
  if (!text) return [];

  const config = {
    splitThreshold: DEFAULT_CHUNK_THRESHOLD,
    targetSize: DEFAULT_TARGET_CHUNK_SIZE,
    minSize: DEFAULT_MIN_CHUNK_SIZE,
    maxSize: DEFAULT_MAX_CHUNK_SIZE,
    ...options,
  };

  if (text.length <= config.splitThreshold) {
    return [text];
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = findSplitIndex(text, start, config);
    chunks.push(text.slice(start, end));
    start = end;
  }

  return chunks;
}

export function buildStoryContextAnalysisPrompt(template, storyText) {
  return template.replace("{story_text}", storyText);
}

export function buildChunkTranslationPrompt(
  template,
  { contextSummary, chunkText, chunkIndex, totalChunks },
) {
  return template
    .replace("{context_summary}", contextSummary)
    .replace("{chunk_index}", String(chunkIndex))
    .replace("{total_chunks}", String(totalChunks))
    .replace("{chunk_text}", chunkText);
}
