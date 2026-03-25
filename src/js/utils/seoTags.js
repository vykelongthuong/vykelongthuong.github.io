export const DEFAULT_SEO_TAGS_MAX_CHARS = 500;

export function normalizeSeoTagsOutput(raw, maxChars = DEFAULT_SEO_TAGS_MAX_CHARS) {
  const normalizedMax = Number.isFinite(maxChars) && maxChars > 0
    ? Math.floor(maxChars)
    : DEFAULT_SEO_TAGS_MAX_CHARS;

  const tags = String(raw || "")
    .replace(/[\r\n]+/g, " ")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (!tags.length) return "";

  const uniqueTags = [...new Set(tags)];
  const selected = [];
  let totalLength = 0;

  for (const tag of uniqueTags) {
    const nextLength = selected.length === 0
      ? tag.length
      : totalLength + 2 + tag.length;

    if (nextLength > normalizedMax) {
      break;
    }

    selected.push(tag);
    totalLength = nextLength;
  }

  return selected.join(", ");
}
