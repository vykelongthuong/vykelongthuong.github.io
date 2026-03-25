const HISTORY_STORAGE_KEY = "ai-story-translator.history.v1";

export const FRONTEND_HISTORY_LABEL = "Trình duyệt (localStorage)";

export function createEmptyHistory() {
  return { docx: [], srt: [] };
}

function normalizeEntry(rawEntry = {}) {
  const fileName =
    typeof rawEntry.fileName === "string" && rawEntry.fileName.trim()
      ? rawEntry.fileName.trim()
      : typeof rawEntry.name === "string"
        ? rawEntry.name.trim()
        : "";
  const name =
    typeof rawEntry.name === "string" && rawEntry.name.trim()
      ? rawEntry.name.trim()
      : fileName;

  return {
    id: typeof rawEntry.id === "string" ? rawEntry.id.trim() : "",
    isCompleted: Boolean(rawEntry.isCompleted),
    isDraft: Boolean(rawEntry.isDraft),
    sourceUrl:
      typeof rawEntry.sourceUrl === "string" ? rawEntry.sourceUrl.trim() : "",
    name,
    fileName,
    content: typeof rawEntry.content === "string" ? rawEntry.content : "",
    original: typeof rawEntry.original === "string" ? rawEntry.original : "",
    date:
      typeof rawEntry.date === "string" && rawEntry.date.trim()
        ? rawEntry.date
        : new Date().toLocaleString("vi-VN"),
    titleSuggestions: Array.isArray(rawEntry.titleSuggestions)
      ? rawEntry.titleSuggestions
      : [],
    storyDescription:
      typeof rawEntry.storyDescription === "string"
        ? rawEntry.storyDescription
        : "",
    favoriteTitle:
      typeof rawEntry.favoriteTitle === "string" ? rawEntry.favoriteTitle : "",
    conversation: Array.isArray(rawEntry.conversation)
      ? rawEntry.conversation
      : [],
    storyIcon: typeof rawEntry.storyIcon === "string" ? rawEntry.storyIcon : "",
    customStoryTitle:
      typeof rawEntry.customStoryTitle === "string"
        ? rawEntry.customStoryTitle
        : "",
    customStoryGenre:
      typeof rawEntry.customStoryGenre === "string"
        ? rawEntry.customStoryGenre
        : "",
    customStoryDescription:
      typeof rawEntry.customStoryDescription === "string"
        ? rawEntry.customStoryDescription
        : "",
    storageLabel:
      typeof rawEntry.storageLabel === "string" ? rawEntry.storageLabel : "",
    cleanedContent:
      typeof rawEntry.cleanedContent === "string" ? rawEntry.cleanedContent : "",
    seoTags: typeof rawEntry.seoTags === "string" ? rawEntry.seoTags : "",
    storyQuiz: typeof rawEntry.storyQuiz === "string" ? rawEntry.storyQuiz : "",
  };
}

export function normalizeHistory(raw) {
  if (!raw || typeof raw !== "object") {
    return createEmptyHistory();
  }

  return {
    docx: Array.isArray(raw.docx) ? raw.docx.map(normalizeEntry) : [],
    srt: Array.isArray(raw.srt) ? raw.srt.map(normalizeEntry) : [],
  };
}

export function upsertHistoryEntry(history, type, entry) {
  if (type !== "docx" && type !== "srt") return normalizeHistory(history);

  const next = normalizeHistory(history);
  const safeEntry = normalizeEntry(entry);

  if (safeEntry.id) {
    next[type] = next[type].filter((item) => item.id !== safeEntry.id);
  }

  next[type] = [safeEntry, ...next[type]].slice(0, 500);
  return next;
}

export function deleteHistoryEntry(history, type, index) {
  if (type !== "docx" && type !== "srt") return normalizeHistory(history);

  const next = normalizeHistory(history);
  next[type] = next[type].filter((_, itemIndex) => itemIndex !== index);
  return next;
}

export function setHistoryEntryCompleted(history, type, index, isCompleted) {
  if (type !== "docx" && type !== "srt") return normalizeHistory(history);

  const next = normalizeHistory(history);
  if (!next[type][index]) return next;

  next[type][index] = {
    ...next[type][index],
    isCompleted: Boolean(isCompleted),
  };
  return next;
}

export function setHistoryEntryLabel(history, type, index, storageLabel) {
  if (type !== "docx" && type !== "srt") return normalizeHistory(history);

  const next = normalizeHistory(history);
  if (!next[type][index]) return next;

  next[type][index] = {
    ...next[type][index],
    storageLabel:
      typeof storageLabel === "string" ? storageLabel.trim().slice(0, 60) : "",
  };
  return next;
}

export function getHistoryStats(history) {
  const normalized = normalizeHistory(history);
  const translatedStories = normalized.docx.filter((item) => !item.isDraft);
  const storyTotalCount = translatedStories.length;
  const storyCompletedCount = translatedStories.filter(
    (item) => item.isCompleted,
  ).length;

  return {
    totalCount: storyTotalCount,
    completedCount: storyCompletedCount,
    pendingCount: storyTotalCount - storyCompletedCount,
    byType: {
      docx: {
        totalCount: storyTotalCount,
        completedCount: storyCompletedCount,
      },
      srt: {
        totalCount: normalized.srt.length,
        completedCount: normalized.srt.filter((item) => item.isCompleted).length,
      },
    },
  };
}

export function parseImportedHistory(rawHistory) {
  if (Array.isArray(rawHistory)) {
    return normalizeHistory({ docx: rawHistory, srt: [] });
  }

  if (
    rawHistory &&
    typeof rawHistory === "object" &&
    rawHistory.entry &&
    (rawHistory.type === "docx" || rawHistory.type === "srt")
  ) {
    return normalizeHistory({ [rawHistory.type]: [rawHistory.entry] });
  }

  return normalizeHistory(rawHistory);
}

export function loadHistoryFromBrowserStorage(storage = globalThis?.localStorage) {
  try {
    const raw = storage?.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return createEmptyHistory();
    return normalizeHistory(JSON.parse(raw));
  } catch {
    return createEmptyHistory();
  }
}

export function saveHistoryToBrowserStorage(
  history,
  storage = globalThis?.localStorage,
) {
  const normalized = normalizeHistory(history);
  storage?.setItem(HISTORY_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
