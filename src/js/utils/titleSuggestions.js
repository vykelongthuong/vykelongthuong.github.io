export function parseTitleSuggestions(responseText) {
  if (!responseText) return [];
  const trimmed = responseText.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch (error) {
    // Fall back to line parsing.
  }

  return trimmed
    .split("\n")
    .map((line) => line.replace(/^\s*(?:\d+[.)-]?|[-*])\s*/, "").trim())
    .filter(Boolean);
}
