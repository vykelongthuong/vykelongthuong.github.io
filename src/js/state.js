export const state = {
  apiKey: "",
  selectedModel: "",
  apiBaseUrl: "https://rwkl5qt.9router.com",
  originalContent: "",
  translatedContent: "",
  analysisContent: "",
  currentFileType: null,
  parsedSrt: [],
  isFirstTranslationDone: false,
  inputMethod: "file",
  isManualChunkMode: false,
  manualChunks: [],
  timerInterval: null,
  startTime: 0,
  qaAnswerContent: "",
  storyDescriptionContent: "",
  cleanedContent: "",
  seoTagsContent: "",
  storyQuizContent: "",
  storyIcon: "",
  customStoryTitle: "",
  customStoryGenre: "",
  customStoryDescription: "",
  titleSuggestionsContent: [],
  favoriteTitle: "",
  pendingHistoryFileName: "",
  historySavedForCurrentTranslation: false,
  currentStorageId: "",
  currentSourceUrl: "",
  currentConversationLog: [],
  currentRecordCompleted: false,
  currentStorageLabel: "",
  isEditingExistingHistoryNode: false,
};

export function getApiKey() {
  return state.apiKey;
}

export function setApiKey(key) {
  state.apiKey = key;
}

export function setSelectedModel(model) {
  state.selectedModel = model;
}

export function getApiBaseUrl() {
  return state.apiBaseUrl;
}

export function setApiBaseUrl(value) {
  state.apiBaseUrl = value;
}
