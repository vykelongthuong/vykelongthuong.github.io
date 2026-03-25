export function shouldAutoSuggestTitles(toggleElement) {
  if (!toggleElement) return true;
  return Boolean(toggleElement.checked);
}
