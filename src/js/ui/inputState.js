import { dom } from "./dom.js";
import { state, getApiKey, getApiBaseUrl } from "../state.js";
import { stopTimer } from "../utils/timer.js";
import { isRequiredSourceUrlProvided } from "../utils/storageSourceRequirement.js";

export function updateCharacterCount(text) {
  const count = text.length;
  if (count > 0) {
    dom.totalCharCount.textContent = count.toLocaleString("vi-VN");
    dom.characterCountContainer.classList.remove("hidden");
  } else {
    dom.characterCountContainer.classList.add("hidden");
  }
}

export function updateTranslateButtonState() {
  const hasApiKey = Boolean(getApiKey());
  const hasApiBaseUrl = Boolean((getApiBaseUrl() || "").trim());
  const hasModel = Boolean(dom.modelSelect?.value);
  const hasFile = dom.docFileInput.files.length > 0;
  const hasPastedText = dom.pasteInput.value.trim() !== "";
  const hasManualChunks = Array.isArray(state.manualChunks)
    ? state.manualChunks.some((chunk) => `${chunk || ""}`.trim() !== "")
    : false;
  const isInputReady =
    (state.inputMethod === "file" && hasFile) ||
    (state.inputMethod === "paste" &&
      (state.isManualChunkMode ? hasManualChunks : hasPastedText));
  const hasRequiredSourceUrl = isRequiredSourceUrlProvided(
    dom.storageIdInput?.value || "",
  );

  dom.translateBtn.disabled = !(
    hasApiKey &&
    hasApiBaseUrl &&
    hasModel &&
    isInputReady &&
    hasRequiredSourceUrl
  );
  dom.evaluateBtn.disabled = !(
    hasApiKey &&
    hasApiBaseUrl &&
    hasModel &&
    isInputReady
  );
  if (dom.storyDescriptionBtn) {
    const isStoryInput = state.currentFileType !== "srt";
    const hasFavoriteTitle = Boolean(state.favoriteTitle);
    dom.storyDescriptionBtn.disabled = !(
      hasApiKey &&
      hasApiBaseUrl &&
      hasModel &&
      isInputReady &&
      isStoryInput &&
      hasFavoriteTitle
    );
  }

  if (dom.qaAskBtn && dom.qaQuestionInput) {
    const hasQuestion = dom.qaQuestionInput.value.trim() !== "";
    const isStoryInput = state.currentFileType !== "srt";
    dom.qaAskBtn.disabled = !(
      hasApiKey &&
      hasApiBaseUrl &&
      hasModel &&
      isInputReady &&
      hasQuestion &&
      isStoryInput
    );
  }

  if (state.isFirstTranslationDone) {
    dom.translateBtn.querySelector("span").textContent = "Dịch lại";
    dom.translateBtn.classList.remove("bg-blue-600", "hover:bg-blue-700");
    dom.translateBtn.classList.add("bg-purple-600", "hover:bg-purple-700");
  } else {
    dom.translateBtn.querySelector("span").textContent = "Bắt đầu dịch";
    dom.translateBtn.classList.add("bg-blue-600", "hover:bg-blue-700");
    dom.translateBtn.classList.remove("bg-purple-600", "hover:bg-purple-700");
  }
}

export function toggleActionButtons(disabled) {
  dom.translateBtn.disabled = disabled;
  dom.titleSuggestionBtn.disabled = disabled;
  dom.evaluateBtn.disabled = disabled;
  if (dom.storyDescriptionBtn) {
    dom.storyDescriptionBtn.disabled = disabled;
  }
  if (dom.storyDescriptionRegenerateBtn) {
    dom.storyDescriptionRegenerateBtn.disabled = disabled;
  }
  if (dom.storyDescriptionCopyBtn) {
    dom.storyDescriptionCopyBtn.disabled = disabled;
  }
  if (dom.seoTagsCopyBtn) {
    dom.seoTagsCopyBtn.disabled = disabled;
  }
  if (dom.qaAskBtn) {
    dom.qaAskBtn.disabled = disabled;
  }
  if (dom.seoTagsBtn) {
    dom.seoTagsBtn.disabled = disabled;
  }
  if (dom.storyQuizBtn) {
    dom.storyQuizBtn.disabled = disabled;
  }
  if (dom.cleanTranslatedContentBtn) {
    dom.cleanTranslatedContentBtn.disabled = disabled;
  }
  if (dom.cleanedCopyBtn) {
    dom.cleanedCopyBtn.disabled = disabled;
  }
  if (dom.saveNodeChangesBtn) {
    dom.saveNodeChangesBtn.disabled = disabled;
  }
}

export function updateApiKeyChecks() {
  updateTranslateButtonState();
}

export function updateApiKeyUIAndChecks() {
  updateApiKeyChecks();
}

export function clearFileInput() {
  dom.docFileInput.value = "";
  dom.fileNameSpan.textContent = "Kéo và thả hoặc nhấn để chọn file";
  dom.fileNameSpan.classList.add("text-slate-500");
  dom.fileNameSpan.classList.remove("text-slate-700", "font-medium");
  dom.uploadIcon.classList.remove("hidden");
  dom.clearFileBtn.classList.add("hidden");
  state.currentFileType = null;
}

export function switchInputMethod(method) {
  state.inputMethod = method;
  const isFile = method === "file";

  dom.uploadTab.classList.toggle("tab-active", isFile);
  dom.uploadTab.classList.toggle("border-transparent", !isFile);
  dom.uploadTab.classList.toggle("text-slate-400", !isFile);

  dom.pasteTab.classList.toggle("tab-active", !isFile);
  dom.pasteTab.classList.toggle("border-transparent", isFile);
  dom.pasteTab.classList.toggle("text-slate-400", isFile);

  dom.uploadPanel.classList.toggle("hidden", !isFile);
  dom.pastePanel.classList.toggle("hidden", isFile);

  if (isFile) {
    dom.pasteInput.value = "";
    if (dom.docFileInput.files.length === 0) {
      dom.addCommentBtn.classList.add("hidden");
      dom.evaluateBtn.classList.add("hidden");
      dom.titleSuggestionBtn.classList.add("hidden");
      dom.storyDescriptionBtn.classList.add("hidden");
    }
    dom.qaSection.classList.add("hidden");
    dom.qaQuestionInput.value = "";
    dom.qaAnswerOutput.textContent = "";
  } else {
    clearFileInput();
    const hasText = dom.pasteInput.value.trim() !== "";
    const hasManualChunks = Array.isArray(state.manualChunks)
      ? state.manualChunks.some((chunk) => `${chunk || ""}`.trim() !== "")
      : false;
    const hasAnyStoryInput = state.isManualChunkMode
      ? hasManualChunks
      : hasText;
    dom.addCommentBtn.classList.toggle("hidden", !hasAnyStoryInput);
    dom.evaluateBtn.classList.toggle("hidden", !hasAnyStoryInput);
    dom.titleSuggestionBtn.classList.toggle("hidden", !hasAnyStoryInput);
    dom.storyDescriptionBtn.classList.toggle("hidden", !hasAnyStoryInput);
    dom.qaSection.classList.toggle("hidden", !hasAnyStoryInput);
    if (!hasAnyStoryInput) {
      dom.qaQuestionInput.value = "";
      dom.qaAnswerOutput.textContent = "";
    }
  }
  updateCharacterCount(dom.pasteInput.value);
  updateTranslateButtonState();
}

export function resetFileSelection() {
  clearFileInput();
  dom.pasteInput.value = "";
  dom.resultArea.classList.add("hidden");
  dom.titleSuggestionArea.classList.add("hidden");
  dom.titleSuggestionOutput.innerHTML = "";
  dom.storyDescriptionArea.classList.add("hidden");
  dom.storyDescriptionOutput.textContent = "";
  dom.storyDescriptionBtn.classList.add("hidden");
  if (dom.titleSuggestionToggle) {
    dom.titleSuggestionToggle.checked = true;
  }
  dom.evaluationResultArea.classList.add("hidden");
  dom.qaSection.classList.add("hidden");
  dom.qaQuestionInput.value = "";
  dom.qaAnswerOutput.textContent = "";
  dom.addCommentBtn.classList.add("hidden");
  dom.evaluateBtn.classList.add("hidden");
  dom.commentSection.classList.add("hidden");
  dom.commentActions.classList.add("hidden");
  dom.translatedOutput.textContent = "";
  if (dom.cleanedOutputArea) {
    dom.cleanedOutputArea.classList.add("hidden");
  }
  if (dom.cleanedOutput) {
    dom.cleanedOutput.textContent = "";
  }
  if (dom.seoTagsArea) {
    dom.seoTagsArea.classList.add("hidden");
  }
  if (dom.seoTagsOutput) {
    dom.seoTagsOutput.textContent = "";
  }
  if (dom.storyQuizArea) {
    dom.storyQuizArea.classList.add("hidden");
  }
  if (dom.storyQuizOutput) {
    dom.storyQuizOutput.textContent = "";
  }
  dom.statusDiv.innerHTML = "";
  dom.detailedStatusContainer.classList.add("hidden");
  dom.characterCountContainer.classList.add("hidden");
  dom.totalCharCount.textContent = "0";
  state.originalContent = "";
  state.translatedContent = "";
  state.analysisContent = "";
  state.qaAnswerContent = "";
  state.storyDescriptionContent = "";
  state.cleanedContent = "";
  state.seoTagsContent = "";
  state.storyQuizContent = "";
  state.storyIcon = "";
  state.customStoryTitle = "";
  state.customStoryGenre = "";
  state.customStoryDescription = "";
  state.titleSuggestionsContent = [];
  state.favoriteTitle = "";
  state.pendingHistoryFileName = "";
  state.historySavedForCurrentTranslation = false;
  state.currentStorageId = "";
  state.currentSourceUrl = "";
  state.currentConversationLog = [];
  state.currentRecordCompleted = false;
  state.currentStorageLabel = "";
  state.isEditingExistingHistoryNode = false;
  if (dom.storyTitleInput) {
    dom.storyTitleInput.value = "";
  }
  if (dom.storyGenreInput) {
    dom.storyGenreInput.value = "";
  }
  if (dom.storyMetadataOutput) {
    dom.storyMetadataOutput.textContent = "";
  }
  if (dom.storageIdInput) {
    dom.storageIdInput.value = "";
  }
  if (dom.storageIdMessage) {
    dom.storageIdMessage.textContent = "";
    dom.storageIdMessage.className = "text-xs text-slate-400 mt-1";
  }
  state.isFirstTranslationDone = false;
  state.currentFileType = null;
  state.isManualChunkMode = false;
  state.manualChunks = [];
  if (dom.manualChunkModeToggle) {
    dom.manualChunkModeToggle.checked = false;
  }
  if (dom.manualChunkPanel) {
    dom.manualChunkPanel.classList.add("hidden");
  }
  if (dom.manualChunkList) {
    dom.manualChunkList.innerHTML = "";
  }
  const pasteInputLabel = document.querySelector('label[for="pasteInput"]');
  if (pasteInputLabel) {
    pasteInputLabel.classList.remove("hidden");
  }
  if (dom.pasteInput) {
    dom.pasteInput.classList.remove("hidden");
  }
  dom.toggleCommentsBtn.querySelector("i").classList.add("fa-eye");
  dom.toggleCommentsBtn.querySelector("i").classList.remove("fa-eye-slash");
  dom.toggleEvaluationBtn.querySelector("i").classList.add("fa-eye");
  dom.toggleEvaluationBtn.querySelector("i").classList.remove("fa-eye-slash");
  dom.timerDisplay.classList.add("hidden");
  dom.timerDisplay.textContent = "";
  stopTimer();
  updateTranslateButtonState();
}
