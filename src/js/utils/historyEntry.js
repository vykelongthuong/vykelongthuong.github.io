export function buildHistoryEntry({
  fileName,
  content,
  original,
  date = new Date().toLocaleString("vi-VN"),
  titleSuggestions = [],
  storyDescription = "",
  favoriteTitle = "",
  id = "",
  sourceUrl = "",
  conversation = [],
  storyIcon = "",
  customStoryTitle = "",
  customStoryGenre = "",
  customStoryDescription = "",
  isCompleted = false,
  isDraft = false,
  storageLabel = "",
  cleanedContent = "",
  seoTags = "",
  storyQuiz = "",
}) {
  const safeFavoriteTitle =
    typeof favoriteTitle === "string" ? favoriteTitle.trim() : "";
  const safeId = typeof id === "string" ? id.trim() : "";
  const safeSourceUrl = typeof sourceUrl === "string" ? sourceUrl.trim() : "";

  return {
    id: safeId,
    sourceUrl: safeSourceUrl,
    name: safeFavoriteTitle || fileName,
    fileName,
    content,
    original,
    date,
    titleSuggestions: Array.isArray(titleSuggestions) ? titleSuggestions : [],
    storyDescription:
      typeof storyDescription === "string" ? storyDescription : "",
    favoriteTitle: safeFavoriteTitle,
    conversation: Array.isArray(conversation) ? conversation : [],
    storyIcon: typeof storyIcon === "string" ? storyIcon : "",
    customStoryTitle:
      typeof customStoryTitle === "string" ? customStoryTitle : "",
    customStoryGenre:
      typeof customStoryGenre === "string" ? customStoryGenre : "",
    customStoryDescription:
      typeof customStoryDescription === "string" ? customStoryDescription : "",
    storageLabel: typeof storageLabel === "string" ? storageLabel : "",
    cleanedContent: typeof cleanedContent === "string" ? cleanedContent : "",
    seoTags: typeof seoTags === "string" ? seoTags : "",
    storyQuiz: typeof storyQuiz === "string" ? storyQuiz : "",
    isCompleted: Boolean(isCompleted),
    isDraft: Boolean(isDraft),
  };
}
