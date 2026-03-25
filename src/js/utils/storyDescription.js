export function buildStoryDescriptionPrompt(
  template,
  storyText,
  favoriteTitle,
) {
  return template
    .replace("{favorite_title}", favoriteTitle)
    .replace("{story_text}", storyText);
}
