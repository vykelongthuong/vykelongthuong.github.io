export function resolveCleanedContent(stateContent, renderedContent = "") {
  const normalizedStateContent =
    typeof stateContent === "string" ? stateContent.trim() : "";
  if (normalizedStateContent) {
    return normalizedStateContent;
  }

  return typeof renderedContent === "string" ? renderedContent.trim() : "";
}
