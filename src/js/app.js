import { dom } from "./ui/dom.js";
import { state } from "./state.js";
import {
  updateApiKeyUIAndChecks,
  updateCharacterCount,
  updateTranslateButtonState,
  clearFileInput,
  switchInputMethod,
  resetFileSelection,
} from "./ui/inputState.js";
import { showStatus } from "./ui/status.js";
import {
  loadApiKeyFromCache,
  saveApiKeyToCache,
  saveSelectedModelToCache,
  saveApiBaseUrlToCache,
  getCachedSelectedModel,
  getCachedApiBaseUrl,
} from "./services/apiKeyService.js";
import { fetchModels } from "./services/apiService.js";
import { filterModelIds, groupModelIdsByProvider } from "./utils/models.js";
import {
  renderHistory,
  handleStorageRecordClick,
  validateStorageSourceInput,
  pickAndImportHistoryFile,
  pickHistoryStorageDirectory,
  applyHistorySearchFilter,
  toggleStorageNodeCompactMode,
  toggleCompletedVisibilityMode,
} from "./services/historyServiceFrontend.js";
import { extractTextFromHtml } from "./utils/text.js";
import { resolveCleanedContent } from "./utils/cleanedContent.js";
import {
  normalizeManualChunks,
  getManualChunksForEditor,
  mergeManualChunksForContext,
} from "./utils/manualChunks.js";
import { handleFileSelect } from "./handlers/fileHandlers.js";
import {
  handleTranslation,
  handleTitleSuggestion,
  handleEvaluation,
  handleStoryQa,
  handleStoryDescription,
  handleSelectFavoriteTitle,
  handleGenerateStoryMetadata,
  handleCleanTranslatedContent,
  handleGenerateSeoTags,
  handleGenerateStoryQuiz,
  handleSaveCurrentNodeChanges,
} from "./handlers/translationHandlers.js";
import {
  handleCommentProcessing,
  translateAllComments,
  handleSingleCommentTranslate,
} from "./handlers/commentHandlers.js";
import {
  toggleCommentVisibility,
  toggleEvaluationVisibility,
} from "./ui/commentUI.js";

function initializeApp() {
  renderHistory();
  loadApiKeyFromCache();
  dom.customPrompt.placeholder = "Ví dụ: Dịch với văn phong hài hước, dí dỏm.";
  Notification.requestPermission();
  addEventListeners();
  updateApiKeyUIAndChecks();
  initializeApiKeyInput();
  loadModels();
}

function initializeApiKeyInput() {
  const defaultKey = state.apiKey || "hello";
  dom.apiKeyInput.value = defaultKey;
  saveApiKeyToCache(defaultKey);

  if (dom.apiBaseUrlInput) {
    const defaultApiBaseUrl = getCachedApiBaseUrl();
    dom.apiBaseUrlInput.value = defaultApiBaseUrl;
    saveApiBaseUrlToCache(defaultApiBaseUrl);
  }
}

async function loadModels() {
  dom.modelSelect.innerHTML = '<option value="">Đang tải model...</option>';
  try {
    const models = await fetchModels();
    const savedModel = getCachedSelectedModel();
    const filteredModels = filterModelIds(models);
    if (!filteredModels.length) {
      dom.modelSelect.innerHTML =
        '<option value="">Không tìm thấy model</option>';
      updateTranslateButtonState();
      return;
    }

    const grouped = groupModelIdsByProvider(filteredModels);
    const providers = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
    const formatProviderLabel = (provider) => {
      const normalized = `${provider || "other"}`.trim();
      if (!normalized) return "Other";
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    };

    if (providers.length <= 1) {
      dom.modelSelect.innerHTML = filteredModels
        .map((model) => {
          const selected = model.id === savedModel ? "selected" : "";
          return `<option value="${model.id}" ${selected}>${model.id}</option>`;
        })
        .join("");
    } else {
      dom.modelSelect.innerHTML = providers
        .map((provider) => {
          const options = grouped[provider]
            .map((model) => {
              const selected = model.id === savedModel ? "selected" : "";
              return `<option value="${model.id}" ${selected}>${model.id}</option>`;
            })
            .join("");

          return `<optgroup label="${formatProviderLabel(provider)}">${options}</optgroup>`;
        })
        .join("");
    }

    if (!dom.modelSelect.value) {
      dom.modelSelect.value = savedModel || filteredModels[0]?.id || "";
    }
    saveSelectedModelToCache(dom.modelSelect.value || "");
  } catch (error) {
    console.error("Lỗi tải models:", error);
    dom.modelSelect.innerHTML = '<option value="">Lỗi tải model</option>';
    showStatus(`Lỗi tải model: ${error.message}`, false);
  } finally {
    updateTranslateButtonState();
  }
}

function updateStoryActionVisibility() {
  const hasText = dom.pasteInput.value.trim() !== "";
  const hasManualChunkText =
    normalizeManualChunks(state.manualChunks).length > 0;
  const hasAnyStoryInput = state.isManualChunkMode
    ? hasManualChunkText
    : hasText;

  dom.addCommentBtn.classList.toggle("hidden", !hasAnyStoryInput);
  dom.evaluateBtn.classList.toggle("hidden", !hasAnyStoryInput);
  dom.qaSection.classList.toggle("hidden", !hasAnyStoryInput);
  dom.titleSuggestionBtn.classList.toggle("hidden", !hasAnyStoryInput);
  dom.storyDescriptionBtn.classList.toggle("hidden", !hasAnyStoryInput);

  if (!hasAnyStoryInput) {
    dom.qaQuestionInput.value = "";
    dom.qaAnswerOutput.textContent = "";
  }
}

function syncManualChunksFromDom() {
  if (!dom.manualChunkList) {
    state.manualChunks = [];
    return;
  }

  const values = Array.from(
    dom.manualChunkList.querySelectorAll("textarea[data-manual-chunk]"),
  ).map((textarea) => textarea.value || "");

  state.manualChunks = values;
}

function createManualChunkRow(value = "", index = 0) {
  const row = document.createElement("div");
  row.className = "space-y-1";

  const header = document.createElement("div");
  header.className = "flex items-center justify-between";

  const title = document.createElement("span");
  title.className = "text-xs text-slate-300";
  title.textContent = `Đoạn ${index + 1}`;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className =
    "px-2 py-0.5 text-[11px] bg-rose-700 text-white rounded hover:bg-rose-600";
  removeBtn.textContent = "Xóa";
  removeBtn.addEventListener("click", () => {
    row.remove();
    syncManualChunksFromDom();
    renderManualChunks();
    updateStoryActionVisibility();
    updateTranslateButtonState();
    updateCharacterCount(mergeManualChunksForContext(state.manualChunks));
  });

  const textarea = document.createElement("textarea");
  textarea.rows = 4;
  textarea.dataset.manualChunk = "true";
  textarea.className =
    "block w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-slate-100";
  textarea.placeholder = "Dán nội dung đoạn vào đây...";
  textarea.value = value;
  textarea.addEventListener("input", () => {
    syncManualChunksFromDom();
    updateStoryActionVisibility();
    updateTranslateButtonState();
    updateCharacterCount(mergeManualChunksForContext(state.manualChunks));
  });

  header.appendChild(title);
  header.appendChild(removeBtn);
  row.appendChild(header);
  row.appendChild(textarea);

  return row;
}

function updatePasteInputVisibility() {
  const pasteInputLabel = document.querySelector('label[for="pasteInput"]');
  const shouldHidePasteInput = state.isManualChunkMode;

  if (pasteInputLabel) {
    pasteInputLabel.classList.toggle("hidden", shouldHidePasteInput);
  }
  if (dom.pasteInput) {
    dom.pasteInput.classList.toggle("hidden", shouldHidePasteInput);
  }
}

function renderManualChunks() {
  if (!dom.manualChunkList) return;
  const source = getManualChunksForEditor(state.manualChunks);
  dom.manualChunkList.innerHTML = "";

  source.forEach((chunk, index) => {
    dom.manualChunkList.appendChild(createManualChunkRow(chunk, index));
  });

  syncManualChunksFromDom();
}

function setManualChunkMode(enabled) {
  state.isManualChunkMode = enabled;
  if (dom.manualChunkPanel) {
    dom.manualChunkPanel.classList.toggle("hidden", !enabled);
  }
  updatePasteInputVisibility();
  if (enabled) {
    renderManualChunks();
    updateCharacterCount(mergeManualChunksForContext(state.manualChunks));
  } else {
    updateCharacterCount(dom.pasteInput.value);
  }
  updateStoryActionVisibility();
  updateTranslateButtonState();
}

function addEventListeners() {
  dom.apiKeyInput.addEventListener("input", () => {
    saveApiKeyToCache(dom.apiKeyInput.value.trim());
    updateApiKeyUIAndChecks();
  });
  dom.apiKeyInput.addEventListener("change", () => {
    loadModels();
  });
  dom.apiBaseUrlInput?.addEventListener("input", () => {
    saveApiBaseUrlToCache(dom.apiBaseUrlInput.value);
    updateTranslateButtonState();
  });
  dom.apiBaseUrlInput?.addEventListener("change", () => {
    loadModels();
  });
  dom.modelSelect.addEventListener("change", () => {
    saveSelectedModelToCache(dom.modelSelect.value);
    updateTranslateButtonState();
  });
  dom.docFileInput.addEventListener("change", handleFileSelect);
  dom.customPromptToggle.addEventListener("change", () => {
    dom.customPrompt.classList.toggle(
      "hidden",
      !dom.customPromptToggle.checked,
    );
  });
  dom.titleSuggestionToggle.addEventListener("change", () => {
    dom.titleSuggestionArea.classList.add("hidden");
    dom.titleSuggestionOutput.innerHTML = "";
  });
  dom.clearFileBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    resetFileSelection();
  });
  dom.translateBtn.addEventListener("click", handleTranslation);
  dom.newTranslationBtn?.addEventListener("click", () => {
    resetFileSelection();
  });
  dom.evaluateBtn.addEventListener("click", handleEvaluation);
  dom.cleanTranslatedContentBtn?.addEventListener(
    "click",
    handleCleanTranslatedContent,
  );
  dom.seoTagsBtn?.addEventListener("click", handleGenerateSeoTags);
  dom.storyQuizBtn?.addEventListener("click", handleGenerateStoryQuiz);
  dom.copyBtn.addEventListener("click", copyTranslatedText);
  dom.saveNodeChangesBtn?.addEventListener(
    "click",
    handleSaveCurrentNodeChanges,
  );
  dom.titleSuggestionBtn.addEventListener("click", handleTitleSuggestion);
  dom.suggestAgainBtn.addEventListener("click", handleTitleSuggestion);
  dom.storyDescriptionBtn.addEventListener("click", handleStoryDescription);
  dom.storyDescriptionRegenerateBtn.addEventListener(
    "click",
    handleStoryDescription,
  );
  dom.storyDescriptionCopyBtn.addEventListener("click", () => {
    copyTextToClipboard(
      state.storyDescriptionContent,
      dom.storyDescriptionCopyBtn,
    );
  });
  dom.seoTagsCopyBtn?.addEventListener("click", () => {
    copyTextToClipboard(state.seoTagsContent, dom.seoTagsCopyBtn);
  });
  dom.cleanedCopyBtn?.addEventListener("click", copyCleanedText);
  dom.generateStoryMetadataBtn?.addEventListener(
    "click",
    handleGenerateStoryMetadata,
  );
  dom.refreshStorageBtn?.addEventListener("click", renderHistory);
  dom.selectHistoryDirectoryBtn?.addEventListener("click", async () => {
    dom.selectHistoryDirectoryBtn.disabled = true;
    try {
      const result = await pickHistoryStorageDirectory();
      if (result?.cancelled) {
        showStatus("Đã hủy chọn thư mục lưu trữ.", false);
        return;
      }
      showStatus("Đã chọn thư mục lưu trữ node thành công.", false);
    } catch (error) {
      console.error("Không thể chọn thư mục lưu trữ:", error);
      showStatus(`Lỗi chọn thư mục: ${error.message}`, false);
    } finally {
      dom.selectHistoryDirectoryBtn.disabled = false;
    }
  });
  dom.importHistoryFileBtn?.addEventListener("click", async () => {
    dom.importHistoryFileBtn.disabled = true;
    try {
      const result = await pickAndImportHistoryFile();
      if (result?.cancelled) {
        showStatus("Đã hủy chọn file history.", false);
        return;
      }
      showStatus("Đã import dữ liệu vào thư mục lưu node hiện tại.", false);
    } catch (error) {
      console.error("Không thể chọn/import file history:", error);
      showStatus(`Lỗi import history: ${error.message}`, false);
    } finally {
      dom.importHistoryFileBtn.disabled = false;
    }
  });
  dom.storageRecordList?.addEventListener("click", handleStorageRecordClick);
  dom.historySearchNameInput?.addEventListener(
    "input",
    applyHistorySearchFilter,
  );
  dom.historySearchUrlInput?.addEventListener(
    "input",
    applyHistorySearchFilter,
  );
  dom.historyGroupFilterSelect?.addEventListener(
    "change",
    applyHistorySearchFilter,
  );
  dom.toggleStorageCompactBtn?.addEventListener(
    "click",
    toggleStorageNodeCompactMode,
  );
  dom.toggleCompletedVisibilityBtn?.addEventListener(
    "click",
    toggleCompletedVisibilityMode,
  );
  dom.storageIdInput?.addEventListener("input", () => {
    validateStorageSourceInput(dom.storageIdInput.value);
  });
  dom.uploadTab.addEventListener("click", () => switchInputMethod("file"));
  dom.pasteTab.addEventListener("click", () => switchInputMethod("paste"));
  dom.manualChunkModeToggle?.addEventListener("change", () => {
    setManualChunkMode(dom.manualChunkModeToggle.checked);
  });
  dom.addManualChunkBtn?.addEventListener("click", () => {
    syncManualChunksFromDom();
    state.manualChunks.push("");
    renderManualChunks();
    updateStoryActionVisibility();
    updateTranslateButtonState();
  });

  dom.pasteInput.addEventListener("input", () => {
    const currentContent = dom.pasteInput.value;
    if (/<[a-z][\s\S]*>/i.test(currentContent)) {
      const extractedText = extractTextFromHtml(currentContent);
      if (dom.pasteInput.value !== extractedText) {
        dom.pasteInput.value = extractedText;
      }
    }
    updateStoryActionVisibility();
    updateCharacterCount(
      state.isManualChunkMode
        ? mergeManualChunksForContext(state.manualChunks)
        : dom.pasteInput.value,
    );
    updateTranslateButtonState();
  });
  dom.addCommentBtn.addEventListener("click", () => {
    dom.commentModal.classList.remove("hidden");
    dom.commentHtmlInput.focus();
  });
  dom.commentCancelBtn.addEventListener("click", () => {
    dom.commentModal.classList.add("hidden");
  });
  dom.processCommentBtn.addEventListener("click", handleCommentProcessing);

  dom.translateAllCommentsGoogleBtn.addEventListener("click", () =>
    translateAllComments("google"),
  );
  dom.translateAllCommentsAIBtn.addEventListener("click", () =>
    translateAllComments("ai"),
  );
  dom.formattedCommentsOutput.addEventListener(
    "click",
    handleSingleCommentTranslate,
  );
  dom.toggleCommentsBtn.addEventListener("click", toggleCommentVisibility);
  dom.toggleEvaluationBtn.addEventListener("click", toggleEvaluationVisibility);
  dom.qaQuestionInput.addEventListener("input", () => {
    updateTranslateButtonState();
  });
  dom.qaAskBtn.addEventListener("click", handleStoryQa);
  dom.titleSuggestionOutput.addEventListener("click", async (event) => {
    const copyButton = event.target.closest("[data-copy-title]");
    if (copyButton) {
      copyTextToClipboard(copyButton.dataset.titleText || "", copyButton);
      return;
    }

    const favoriteButton = event.target.closest("[data-favorite-title]");
    if (!favoriteButton) return;
    await handleSelectFavoriteTitle(favoriteButton.dataset.titleText || "");
  });
}

function copyTextToClipboard(text, button) {
  if (!text) return;
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand("copy");
    if (button) {
      const originalText = button.textContent;
      button.textContent = "Đã sao chép!";
      setTimeout(() => {
        button.textContent = originalText;
      }, 1500);
    }
  } catch (error) {
    console.error("Không thể sao chép", error);
    showStatus("Lỗi: không thể sao chép.", false);
  }
  document.body.removeChild(textArea);
}

function copyTranslatedText() {
  if (!state.translatedContent) return;
  copyTextToClipboard(state.translatedContent, dom.copyBtn);
}

function copyCleanedText() {
  const cleanedContent = resolveCleanedContent(
    state.cleanedContent,
    dom.cleanedOutput?.textContent,
  );

  if (!cleanedContent) {
    showStatus("Chưa có bản làm sạch để sao chép.", false);
    return;
  }

  if (!state.cleanedContent) {
    state.cleanedContent = cleanedContent;
  }

  copyTextToClipboard(cleanedContent, dom.cleanedCopyBtn);
}

initializeApp();
updateTranslateButtonState();
