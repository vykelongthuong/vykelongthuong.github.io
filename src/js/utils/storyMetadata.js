const ALLOWED_STORY_GENRES = [
  "Trinh thám",
  "Tâm lý tội phạm",
  "Kinh dị",
  "Ngôn tình",
  "Ngôn tình ngược",
  "Cổ trang",
];

const DEFAULT_STORY_GENRE = "Ngôn tình";
const DEFAULT_STORY_TITLE = "Truyện Hay Mỗi Ngày";
const DEFAULT_STORY_ICON = "📚";

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKeyword(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveGenreByKeyword(keyword = "") {
  if (!keyword) return "";

  if (keyword.includes("ngon tinh nguoc") || keyword.includes("nguoc tam")) {
    return "Ngôn tình ngược";
  }
  if (keyword.includes("tam ly toi pham") || keyword.includes("toi pham")) {
    return "Tâm lý tội phạm";
  }
  if (keyword.includes("trinh tham") || keyword.includes("detective")) {
    return "Trinh thám";
  }
  if (keyword.includes("kinh di") || keyword.includes("horror")) {
    return "Kinh dị";
  }
  if (
    keyword.includes("co trang") ||
    keyword.includes("co dai") ||
    keyword.includes("historical")
  ) {
    return "Cổ trang";
  }
  if (keyword.includes("ngon tinh") || keyword.includes("romance")) {
    return "Ngôn tình";
  }

  return "";
}

export function normalizeStoryGenre(genre) {
  const cleaned = cleanText(genre);
  if (!cleaned) {
    return DEFAULT_STORY_GENRE;
  }

  const exactMatch = ALLOWED_STORY_GENRES.find(
    (item) => normalizeKeyword(item) === normalizeKeyword(cleaned),
  );
  if (exactMatch) {
    return exactMatch;
  }

  return (
    resolveGenreByKeyword(normalizeKeyword(cleaned)) || DEFAULT_STORY_GENRE
  );
}

export function normalizeStoryIcon(icon) {
  const cleaned = cleanText(icon);
  if (!cleaned) return DEFAULT_STORY_ICON;
  return cleaned.split(/\s+/)[0] || DEFAULT_STORY_ICON;
}

export function buildAudioFavoriteTitle(genre, title, icon) {
  const safeGenre = normalizeStoryGenre(genre);
  const safeTitle = cleanText(title) || DEFAULT_STORY_TITLE;
  const safeIcon = normalizeStoryIcon(icon);
  return `Audio ${safeGenre} / ${safeTitle} ${safeIcon} | Trần Thiên Minh`;
}

export function parseAudioFavoriteTitle(fullTitle) {
  const text = cleanText(fullTitle);
  if (!text) {
    return { genre: "", title: "" };
  }

  const match = text.match(
    /^Audio\s+(.+?)\s*\/\s*(.+?)\s+[^\s|]+\s*\|\s*Trần Thiên Minh$/i,
  );

  if (!match) {
    return { genre: "", title: "" };
  }

  return {
    genre: normalizeStoryGenre(match[1]),
    title: cleanText(match[2]),
  };
}

export function resolveStoryTitleGenre({
  userTitle,
  userGenre,
  aiTitle,
  aiGenre,
  titleSuggestions = [],
}) {
  const fromSuggestion = Array.isArray(titleSuggestions)
    ? titleSuggestions
        .map((item) => parseAudioFavoriteTitle(item))
        .find((item) => item.title || item.genre)
    : null;

  const resolvedTitle =
    cleanText(userTitle) ||
    cleanText(aiTitle) ||
    cleanText(fromSuggestion?.title) ||
    DEFAULT_STORY_TITLE;

  const resolvedGenre = cleanText(userGenre)
    ? cleanText(userGenre)
    : normalizeStoryGenre(
        cleanText(aiGenre) || cleanText(fromSuggestion?.genre),
      );

  return {
    title: resolvedTitle,
    genre: resolvedGenre,
  };
}

export { ALLOWED_STORY_GENRES };
