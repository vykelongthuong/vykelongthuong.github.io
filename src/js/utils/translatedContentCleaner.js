export function cleanTranslatedContent(text) {
  if (typeof text !== "string" || !text) {
    return "";
  }

  return text
    .replace(/["~?*!#:]/g, ",")
    .replace(/[-‐‑‒–—―]+/g, ",")
    .replace(/,{2,}/g, ",")
    .replace(/\.{2,}/g, ".");
}
