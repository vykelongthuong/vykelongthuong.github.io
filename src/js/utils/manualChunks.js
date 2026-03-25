export function normalizeManualChunks(chunks) {
  if (!Array.isArray(chunks)) {
    return [];
  }

  return chunks
    .map((chunk) => (typeof chunk === "string" ? chunk.trim() : ""))
    .filter(Boolean);
}

export function getManualChunksForEditor(chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return [""];
  }

  return chunks.map((chunk) => (typeof chunk === "string" ? chunk : ""));
}

export function mergeManualChunksForContext(chunks, separator = "\n\n") {
  return normalizeManualChunks(chunks).join(separator);
}

export function hasManualChunks(chunks) {
  return normalizeManualChunks(chunks).length > 0;
}
