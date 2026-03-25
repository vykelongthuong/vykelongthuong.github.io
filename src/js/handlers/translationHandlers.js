import { dom } from "../ui/dom.js";
import { state } from "../state.js";
import {
  storyPromptTemplate,
  storyContextAnalysisPromptTemplate,
  chunkedStoryPromptTemplate,
  srtPromptTemplate,
  qualityCheckPromptTemplate,
  regenerationPromptTemplate,
  titleSuggestionPromptTemplate,
  evaluationPromptTemplate,
  storyQaPromptTemplate,
  storyDescriptionPromptTemplate,
  storyMetadataPromptTemplate,
  seoTagsPromptTemplate,
  storyQuizPromptTemplate,
} from "../prompts.js";
import { translateTextAI } from "../services/apiService.js";
import { buildQaPrompt } from "../utils/qa.js";
import { parseTitleSuggestions } from "../utils/titleSuggestions.js";
import { shouldAutoSuggestTitles } from "../utils/titleSuggestionToggle.js";
import { resolveTranslatedContent } from "../utils/translatedContent.js";
import { buildStoryDescriptionPrompt } from "../utils/storyDescription.js";
import {
  DEFAULT_SEO_TAGS_MAX_CHARS,
  normalizeSeoTagsOutput,
} from "../utils/seoTags.js";
import {
  buildAudioFavoriteTitle,
  normalizeStoryIcon,
  resolveStoryTitleGenre,
} from "../utils/storyMetadata.js";
import {
  buildQualityCheckPrompt,
  buildRegenerationPrompt,
  pairChunksForRefine,
  buildChunkAnalysisSummary,
} from "../utils/translationRefine.js";
import { saveToHistory } from "../services/historyService.js";
import { showBrowserNotification } from "../utils/notifications.js";
import { parseSrt, reconstructSrt } from "../utils/srt.js";
import { buildStorageIdentity } from "../utils/storageId.js";
import { resolveStorageIdentityForManualSave } from "../utils/storageIdentitySync.js";
import { cleanTranslatedContent } from "../utils/translatedContentCleaner.js";
import { snapshotComments } from "./commentHandlers.js";
import { startTimer, stopTimer } from "../utils/timer.js";
import { showStatus, updateDetailedStatus } from "../ui/status.js";
import {
  toggleActionButtons,
  updateTranslateButtonState,
} from "../ui/inputState.js";
import {
  splitStoryIntoChunks,
  buildStoryContextAnalysisPrompt,
  buildChunkTranslationPrompt,
} from "../utils/storyChunking.js";
import { isRequiredSourceUrlProvided } from "../utils/storageSourceRequirement.js";
import { retryAsync, isTransientApiError } from "../utils/retry.js";
import {
  normalizeManualChunks,
  mergeManualChunksForContext,
} from "../utils/manualChunks.js";

function pushConversationMessage(message) {
  state.currentConversationLog.push({
    at: new Date().toISOString(),
    ...message,
  });
}

function resolveStorageIdentity(fileName) {
  const rawStorageInput = (dom.storageIdInput?.value || "").trim();
  const currentIdentity = (
    state.currentSourceUrl ||
    state.currentStorageId ||
    ""
  ).trim();

  const shouldAvoidOverwritingLoadedNode =
    state.isEditingExistingHistoryNode &&
    currentIdentity &&
    rawStorageInput === currentIdentity;

  const identity = buildStorageIdentity(
    shouldAvoidOverwritingLoadedNode ? "" : rawStorageInput,
    fileName,
  );
  state.currentStorageId = identity.id;
  state.currentSourceUrl = identity.sourceUrl;
}

function getConversationPayload() {
  const comments = snapshotComments();
  return [
    ...state.currentConversationLog,
    {
      at: new Date().toISOString(),
      role: "system",
      type: "comments_snapshot",
      content: comments,
    },
  ];
}

async function translateWithRetryForChunk(prompt, onRetry) {
  return retryAsync(() => translateTextAI("", prompt), {
    retries: 2,
    baseDelayMs: 1200,
    maxDelayMs: 5000,
    shouldRetry: isTransientApiError,
    onRetry,
  });
}

async function translateStoryWithProvidedChunks(storyChunks, fullStoryText) {
  if (!storyChunks.length) {
    return {
      originalChunks: [],
      translatedChunks: [],
      translatedText: "",
    };
  }

  if (storyChunks.length <= 1) {
    const translatedText = await translateTextAI(
      storyChunks[0],
      storyPromptTemplate,
    );
    return {
      originalChunks: [...storyChunks],
      translatedChunks: [translatedText],
      translatedText,
    };
  }

  showStatus("Truyện dài: đang phân tích bối cảnh tổng thể...", true);
  updateDetailedStatus(
    1,
    `Phân tích bối cảnh trước khi dịch (${storyChunks.length} đoạn)...`,
    false,
    fullStoryText.length,
  );

  const contextSummary = await translateWithRetryForChunk(
    buildStoryContextAnalysisPrompt(
      storyContextAnalysisPromptTemplate,
      fullStoryText,
    ),
    ({ nextAttempt, maxAttempts, delayMs }) => {
      showStatus(
        `Mạng chập chờn, thử lại phân tích bối cảnh (${nextAttempt}/${maxAttempts}) sau ${Math.ceil(delayMs / 1000)}s...`,
        true,
      );
    },
  );

  pushConversationMessage({
    role: "assistant",
    type: "story_context_analysis",
    content: contextSummary.slice(0, 2000),
  });

  updateDetailedStatus(
    1,
    "Hoàn thành phân tích bối cảnh!",
    false,
    fullStoryText.length,
  );

  const translatedChunks = [];
  for (let index = 0; index < storyChunks.length; index += 1) {
    const chunk = storyChunks[index];
    const chunkNumber = index + 1;
    const threadId = chunkNumber + 1;

    showStatus(`Đang dịch đoạn ${chunkNumber}/${storyChunks.length}...`, true);
    updateDetailedStatus(
      threadId,
      `Đang dịch đoạn ${chunkNumber}/${storyChunks.length}...`,
      false,
      chunk.length,
    );

    const translatedChunk = await translateWithRetryForChunk(
      buildChunkTranslationPrompt(chunkedStoryPromptTemplate, {
        contextSummary,
        chunkText: chunk,
        chunkIndex: chunkNumber,
        totalChunks: storyChunks.length,
      }),
      ({ nextAttempt, maxAttempts, delayMs }) => {
        showStatus(
          `Mạng chập chờn, thử lại đoạn ${chunkNumber}/${storyChunks.length} (${nextAttempt}/${maxAttempts}) sau ${Math.ceil(delayMs / 1000)}s...`,
          true,
        );
        updateDetailedStatus(
          threadId,
          `Thử lại đoạn ${chunkNumber}/${storyChunks.length} (${nextAttempt}/${maxAttempts})...`,
          false,
          chunk.length,
        );
      },
    );

    translatedChunks.push(translatedChunk);
    updateDetailedStatus(
      threadId,
      `Hoàn thành đoạn ${chunkNumber}/${storyChunks.length}!`,
      false,
      chunk.length,
    );
  }

  return {
    originalChunks: [...storyChunks],
    translatedChunks,
    translatedText: translatedChunks.join(""),
  };
}

async function translateStoryWithChunking(storyText) {
  const storyChunks = splitStoryIntoChunks(storyText);
  return translateStoryWithProvidedChunks(storyChunks, storyText);
}

async function refineTranslationByChunks(originalChunks, translatedChunks) {
  const chunkPairs = pairChunksForRefine(originalChunks, translatedChunks);
  const analysisChunks = [];
  const refinedChunks = [];

  for (let index = 0; index < chunkPairs.length; index += 1) {
    const chunkPair = chunkPairs[index];
    const chunkNumber = index + 1;

    showStatus(
      `Đang phân tích chất lượng đoạn ${chunkNumber}/${chunkPairs.length}...`,
      true,
    );

    const analysis = await translateWithRetryForChunk(
      buildQualityCheckPrompt(
        qualityCheckPromptTemplate,
        chunkPair.originalText,
        chunkPair.translatedText,
      ),
      ({ nextAttempt, maxAttempts, delayMs }) => {
        showStatus(
          `Mạng chập chờn, thử lại phân tích đoạn ${chunkNumber}/${chunkPairs.length} (${nextAttempt}/${maxAttempts}) sau ${Math.ceil(delayMs / 1000)}s...`,
          true,
        );
      },
    );

    analysisChunks.push(analysis);

    showStatus(
      `Đang dịch lại đoạn ${chunkNumber}/${chunkPairs.length} theo góp ý...`,
      true,
    );

    const refinedChunk = await translateWithRetryForChunk(
      buildRegenerationPrompt(
        regenerationPromptTemplate,
        chunkPair.originalText,
        chunkPair.translatedText,
        analysis,
      ),
      ({ nextAttempt, maxAttempts, delayMs }) => {
        showStatus(
          `Mạng chập chờn, thử lại dịch lại đoạn ${chunkNumber}/${chunkPairs.length} (${nextAttempt}/${maxAttempts}) sau ${Math.ceil(delayMs / 1000)}s...`,
          true,
        );
      },
    );

    refinedChunks.push(refinedChunk);
  }

  return {
    analysisSummary: buildChunkAnalysisSummary(analysisChunks),
    refinedText: refinedChunks.join(""),
  };
}

export async function handleTranslation() {
  toggleActionButtons(true);
  dom.resultArea.classList.add("hidden");
  dom.titleSuggestionArea.classList.add("hidden");
  dom.storyDescriptionArea.classList.add("hidden");
  dom.translatedOutput.textContent = "";
  dom.titleSuggestionOutput.innerHTML = "";
  dom.storyDescriptionOutput.textContent = "";
  state.translatedContent = "";
  state.titleSuggestionsContent = [];
  state.storyDescriptionContent = "";
  state.cleanedContent = "";
  state.seoTagsContent = "";
  state.storyQuizContent = "";
  state.storyIcon = "";
  state.customStoryTitle = "";
  state.customStoryGenre = "";
  state.customStoryDescription = "";
  state.favoriteTitle = "";
  state.pendingHistoryFileName = "";
  state.historySavedForCurrentTranslation = false;
  state.currentConversationLog = [];
  state.currentStorageId = "";
  state.currentSourceUrl = "";
  state.currentRecordCompleted = false;
  state.currentStorageLabel = "";
  if (dom.cleanedOutput) {
    dom.cleanedOutput.textContent = "";
  }
  if (dom.cleanedOutputArea) {
    dom.cleanedOutputArea.classList.add("hidden");
  }
  if (dom.seoTagsOutput) {
    dom.seoTagsOutput.textContent = "";
  }
  if (dom.seoTagsArea) {
    dom.seoTagsArea.classList.add("hidden");
  }
  if (dom.storyQuizOutput) {
    dom.storyQuizOutput.textContent = "";
  }
  if (dom.storyQuizArea) {
    dom.storyQuizArea.classList.add("hidden");
  }
  showStatus("Đang xử lý đầu vào...", true);
  startTimer();

  try {
    let fileName = "Văn bản đã dán";
    let manualChunks = [];
    if (state.inputMethod === "file") {
      const file = dom.docFileInput.files[0];
      if (!file) throw new Error("Vui lòng chọn một file để dịch.");
      fileName = file.name;
      showStatus("Đang đọc file...", true);
      if (state.currentFileType === "srt") {
        state.originalContent = await file.text();
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        state.originalContent = result.value;
      }
    } else {
      state.currentFileType = "docx";
      if (state.isManualChunkMode) {
        manualChunks = normalizeManualChunks(state.manualChunks);
        state.originalContent = mergeManualChunksForContext(manualChunks);
        fileName = "Văn bản dán theo đoạn";
      } else {
        state.originalContent = dom.pasteInput.value;
      }
    }
    if (!state.originalContent.trim()) {
      throw new Error("Không có nội dung để dịch.");
    }

    if (!isRequiredSourceUrlProvided(dom.storageIdInput?.value || "")) {
      throw new Error("Vui lòng nhập URL nguồn hợp lệ trước khi dịch.");
    }

    resolveStorageIdentity(fileName);
    await saveOriginalDraftHistory(fileName);
    pushConversationMessage({
      role: "user",
      type: "translation_request",
      content: {
        storageId: state.currentStorageId,
        sourceUrl: state.currentSourceUrl,
        fileName,
        fileType: state.currentFileType,
      },
    });

    dom.detailedStatusContainer.classList.remove("hidden");
    dom.detailedStatusContainer.innerHTML = "";
    updateDetailedStatus(
      1,
      "Bắt đầu dịch...",
      false,
      state.originalContent.length,
    );

    if (state.currentFileType === "srt") {
      const parsedSrt = parseSrt(state.originalContent);
      const textToTranslate = parsedSrt
        .map((sub) => sub.text)
        .join("\n[<->]\n");
      const rawTranslation = await translateTextAI(
        textToTranslate,
        srtPromptTemplate,
      );
      const translatedLines = rawTranslation
        .split("[<->]")
        .map((line) => line.trim());
      state.translatedContent = reconstructSrt(parsedSrt, translatedLines);
    } else {
      const translationResult = state.isManualChunkMode
        ? await translateStoryWithProvidedChunks(
            manualChunks.length ? manualChunks : [state.originalContent],
            state.originalContent,
          )
        : await translateStoryWithChunking(state.originalContent);

      state.translatedContent = translationResult.translatedText;
      dom.titleSuggestionArea.classList.add("hidden");

      if (translationResult.originalChunks.length > 1) {
        const refinedResult = await refineTranslationByChunks(
          translationResult.originalChunks,
          translationResult.translatedChunks,
        );
        state.analysisContent = refinedResult.analysisSummary;
        state.translatedContent = refinedResult.refinedText;
      } else {
        showStatus("Đang phân tích chất lượng bản dịch...", true);
        state.analysisContent = await translateTextAI(
          "",
          buildQualityCheckPrompt(
            qualityCheckPromptTemplate,
            state.originalContent,
            state.translatedContent,
          ),
        );
        showStatus("Đang áp dụng phân tích và dịch lại...", true);
        state.translatedContent = await translateTextAI(
          "",
          buildRegenerationPrompt(
            regenerationPromptTemplate,
            state.originalContent,
            state.translatedContent,
            state.analysisContent,
          ),
        );
      }

      if (shouldAutoSuggestTitles(dom.titleSuggestionToggle)) {
        try {
          await generateTitleSuggestions({ showNotifications: false });
        } catch (error) {
          console.error("Lỗi tạo gợi ý tên truyện:", error);
        }
      }
    }

    updateDetailedStatus(1, "Hoàn thành!", false, state.originalContent.length);
    setTimeout(() => dom.detailedStatusContainer.classList.add("hidden"), 2000);

    showStatus("Dịch hoàn tất!", false);
    showBrowserNotification(
      "Dịch hoàn tất!",
      "Bản dịch cuối cùng đã sẵn sàng để xem lại.",
    );
    dom.translatedOutput.textContent = state.translatedContent;
    dom.resultArea.classList.remove("hidden");
    state.isFirstTranslationDone = true;
    pushConversationMessage({
      role: "assistant",
      type: "translation_result",
      content: state.translatedContent.slice(0, 1000),
    });

    await saveToHistory(
      state.currentFileType,
      fileName,
      state.translatedContent,
      state.originalContent,
      {
        id: state.currentStorageId,
        sourceUrl: state.currentSourceUrl,
        titleSuggestions: state.titleSuggestionsContent,
        storyDescription: state.storyDescriptionContent,
        favoriteTitle: state.favoriteTitle,
        conversation: getConversationPayload(),
        storyIcon: state.storyIcon,
        customStoryTitle: state.customStoryTitle,
        customStoryGenre: state.customStoryGenre,
        customStoryDescription: state.customStoryDescription,
        storageLabel: state.currentStorageLabel,
        cleanedContent: state.cleanedContent,
        seoTags: state.seoTagsContent,
        storyQuiz: state.storyQuizContent,
        isCompleted: state.currentRecordCompleted,
        isDraft: false,
      },
    );

    state.pendingHistoryFileName = fileName;
    state.historySavedForCurrentTranslation = true;
  } catch (error) {
    console.error("Lỗi trong quá trình dịch:", error);
    showStatus(`Đã xảy ra lỗi: ${error.message}`, false);
  } finally {
    stopTimer();
    toggleActionButtons(false);
    updateTranslateButtonState();
  }
}

function renderTitleSuggestions(titles) {
  dom.titleSuggestionOutput.innerHTML = "";
  if (!titles.length) {
    const empty = document.createElement("p");
    empty.className = "text-sm text-slate-400";
    empty.textContent = "Không có gợi ý phù hợp.";
    dom.titleSuggestionOutput.appendChild(empty);
    return;
  }

  titles.forEach((title) => {
    const row = document.createElement("div");
    row.className =
      "flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2";

    const text = document.createElement("div");
    text.className = "text-sm text-slate-100 break-words flex-1";
    text.textContent = title;

    const actions = document.createElement("div");
    actions.className = "flex items-center gap-2";

    const favoriteButton = document.createElement("button");
    favoriteButton.type = "button";
    favoriteButton.dataset.favoriteTitle = "true";
    favoriteButton.dataset.titleText = title;
    favoriteButton.className =
      "px-3 py-1 text-xs bg-amber-600 text-white rounded-md hover:bg-amber-500 transition-colors";
    favoriteButton.textContent =
      state.favoriteTitle === title ? "Đã chọn" : "Chọn yêu thích";

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.dataset.copyTitle = "true";
    copyButton.dataset.titleText = title;
    copyButton.className =
      "px-3 py-1 text-xs bg-slate-700 text-white rounded-md hover:bg-slate-600 transition-colors";
    copyButton.textContent = "Copy";

    actions.appendChild(favoriteButton);
    actions.appendChild(copyButton);

    row.appendChild(text);
    row.appendChild(actions);
    dom.titleSuggestionOutput.appendChild(row);
  });
}

async function generateTitleSuggestions({ showNotifications = true } = {}) {
  const translatedContent = resolveTranslatedContent(
    state.translatedContent,
    dom.translatedOutput?.textContent,
  );
  if (!translatedContent) return;

  if (!state.translatedContent) {
    state.translatedContent = translatedContent;
  }

  dom.titleSuggestionOutput.innerHTML = "";
  showStatus("Đang nghĩ tên truyện hay...", true);
  const titlesResponse = await translateTextAI(
    "",
    titleSuggestionPromptTemplate.replace(
      "{story_text}",
      translatedContent.substring(0, 8000),
    ),
  );
  const titles = parseTitleSuggestions(titlesResponse);
  state.titleSuggestionsContent = titles;
  pushConversationMessage({
    role: "assistant",
    type: "title_suggestions",
    content: titles,
  });
  state.favoriteTitle = "";
  state.storyDescriptionContent = "";
  dom.storyDescriptionOutput.textContent = "";
  dom.storyDescriptionArea.classList.add("hidden");
  state.historySavedForCurrentTranslation = false;
  renderTitleSuggestions(titles);
  dom.titleSuggestionArea.classList.remove("hidden");
  showStatus("Đã có gợi ý tên truyện!", false);
  if (showNotifications) {
    showBrowserNotification(
      "Đã có gợi ý!",
      "Danh sách tên truyện đã được tạo.",
    );
  }
}

async function generateStoryDescription({ showNotifications = true } = {}) {
  const translatedContent = resolveTranslatedContent(
    state.translatedContent,
    dom.translatedOutput?.textContent,
  );
  if (!translatedContent || !state.favoriteTitle) return;

  if (!state.translatedContent) {
    state.translatedContent = translatedContent;
  }

  dom.storyDescriptionOutput.textContent = "";
  showStatus("Đang tạo mô tả truyện...", true);
  const description = await translateTextAI(
    "",
    buildStoryDescriptionPrompt(
      storyDescriptionPromptTemplate,
      translatedContent.substring(0, 8000),
      state.favoriteTitle,
    ),
  );
  state.storyDescriptionContent = description;
  state.historySavedForCurrentTranslation = false;
  pushConversationMessage({
    role: "assistant",
    type: "story_description",
    content: description,
  });
  dom.storyDescriptionOutput.textContent = description;
  dom.storyDescriptionArea.classList.remove("hidden");
  showStatus("Đã tạo mô tả truyện!", false);
  if (showNotifications) {
    showBrowserNotification("Đã tạo mô tả!", "Mô tả truyện đã sẵn sàng.");
  }
}

export async function handleTitleSuggestion() {
  const translatedContent = resolveTranslatedContent(
    state.translatedContent,
    dom.translatedOutput?.textContent,
  );
  if (!translatedContent) {
    showStatus("Chưa có bản dịch để gợi ý tên truyện.", false);
    return;
  }

  if (!state.translatedContent) {
    state.translatedContent = translatedContent;
  }
  toggleActionButtons(true);
  dom.suggestAgainBtn.disabled = true;
  try {
    await generateTitleSuggestions();
  } catch (error) {
    console.error("Lỗi khi gợi ý tên truyện:", error);
    showStatus(`Lỗi gợi ý: ${error.message}`, false);
  } finally {
    toggleActionButtons(false);
    dom.suggestAgainBtn.disabled = false;
    updateTranslateButtonState();
  }
}

async function saveOriginalDraftHistory(fileName) {
  if (!state.originalContent?.trim()) {
    return;
  }

  await saveToHistory(
    state.currentFileType,
    fileName || state.pendingHistoryFileName || "Văn bản đã dán",
    "",
    state.originalContent,
    {
      id: state.currentStorageId,
      sourceUrl: state.currentSourceUrl,
      titleSuggestions: [],
      storyDescription: "",
      favoriteTitle: "",
      conversation: getConversationPayload(),
      storyIcon: "",
      customStoryTitle: "",
      customStoryGenre: "",
      customStoryDescription: "",
      storageLabel: state.currentStorageLabel,
      cleanedContent: state.cleanedContent,
      seoTags: state.seoTagsContent,
      storyQuiz: state.storyQuizContent,
      isCompleted: false,
      isDraft: true,
    },
  );
}

async function saveTranslatedStoryHistory() {
  if (
    state.currentFileType !== "docx" ||
    !state.translatedContent ||
    state.historySavedForCurrentTranslation
  ) {
    return;
  }

  await saveToHistory(
    "docx",
    state.pendingHistoryFileName || "Văn bản đã dán",
    state.translatedContent,
    state.originalContent,
    {
      id: state.currentStorageId,
      sourceUrl: state.currentSourceUrl,
      titleSuggestions: state.titleSuggestionsContent,
      storyDescription: state.storyDescriptionContent,
      favoriteTitle: state.favoriteTitle,
      conversation: getConversationPayload(),
      storyIcon: state.storyIcon,
      customStoryTitle: state.customStoryTitle,
      customStoryGenre: state.customStoryGenre,
      customStoryDescription: state.customStoryDescription,
      storageLabel: state.currentStorageLabel,
      cleanedContent: state.cleanedContent,
      seoTags: state.seoTagsContent,
      storyQuiz: state.storyQuizContent,
      isCompleted: state.currentRecordCompleted,
      isDraft: false,
    },
  );
  state.historySavedForCurrentTranslation = true;
}

export async function handleStoryDescription() {
  const translatedContent = resolveTranslatedContent(
    state.translatedContent,
    dom.translatedOutput?.textContent,
  );
  if (!translatedContent) {
    showStatus("Chưa có bản dịch để tạo mô tả.", false);
    return;
  }

  if (!state.translatedContent) {
    state.translatedContent = translatedContent;
  }
  if (!state.favoriteTitle) {
    showStatus("Hãy chọn tiêu đề yêu thích trước khi tạo mô tả.", false);
    return;
  }
  toggleActionButtons(true);
  if (dom.storyDescriptionRegenerateBtn) {
    dom.storyDescriptionRegenerateBtn.disabled = true;
  }
  try {
    await generateStoryDescription();
  } catch (error) {
    console.error("Lỗi khi tạo mô tả truyện:", error);
    showStatus(`Lỗi tạo mô tả: ${error.message}`, false);
  } finally {
    toggleActionButtons(false);
    if (dom.storyDescriptionRegenerateBtn) {
      dom.storyDescriptionRegenerateBtn.disabled = false;
    }
    updateTranslateButtonState();
  }
}

export async function handleSelectFavoriteTitle(title) {
  if (!title || !state.translatedContent) return;
  state.favoriteTitle = title;
  pushConversationMessage({
    role: "user",
    type: "favorite_title_selected",
    content: title,
  });
  renderTitleSuggestions(state.titleSuggestionsContent);
  updateTranslateButtonState();
  await handleStoryDescription();
}

async function getStoryContentFromInput() {
  if (state.inputMethod === "file" && dom.docFileInput.files[0]) {
    const file = dom.docFileInput.files[0];
    if (file.name.toLowerCase().endsWith(".docx")) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }
    return "";
  }

  if (state.inputMethod === "paste") {
    if (state.isManualChunkMode) {
      return mergeManualChunksForContext(state.manualChunks);
    }
    if (dom.pasteInput.value.trim() !== "") {
      return dom.pasteInput.value.trim();
    }
  }

  return "";
}

export async function handleEvaluation() {
  showStatus("Đang chuẩn bị nội dung...", true);

  try {
    const contentToEvaluate = await getStoryContentFromInput();

    if (!contentToEvaluate.trim()) {
      showStatus("Không có nội dung truyện để đánh giá.", false);
      return;
    }

    let commentsText = "Không có bình luận nào được cung cấp.";
    const commentElements =
      dom.formattedCommentsOutput.querySelectorAll(".comment-item");
    if (commentElements.length > 0) {
      commentsText = Array.from(commentElements)
        .map((el) => {
          const author = el.querySelector(".font-bold").innerText || "";
          const comment = el.querySelector(".comment-text").innerText || "";
          return `${author.replace(":", "")}: ${comment}`;
        })
        .join("\n");
    }

    toggleActionButtons(true);
    dom.evaluationOutput.textContent = "";
    dom.resultArea.classList.add("hidden");
    showStatus("AI đang đọc và đánh giá truyện...", true);

    pushConversationMessage({
      role: "user",
      type: "evaluation_request",
      content: {
        storyLength: contentToEvaluate.length,
        commentCount: commentElements.length,
      },
    });

    const evaluationResult = await translateTextAI(
      "",
      evaluationPromptTemplate
        .replace("{story_text}", contentToEvaluate)
        .replace("{user_comments}", commentsText),
    );

    dom.evaluationOutput.textContent = evaluationResult;
    dom.evaluationResultArea.classList.remove("hidden");
    dom.evaluationOutput.classList.remove("hidden");
    dom.toggleEvaluationBtn.querySelector("i").classList.add("fa-eye");
    dom.toggleEvaluationBtn.querySelector("i").classList.remove("fa-eye-slash");

    pushConversationMessage({
      role: "assistant",
      type: "evaluation_result",
      content: evaluationResult,
    });
    showStatus("Đánh giá hoàn tất!", false);
    showBrowserNotification(
      "Đánh giá hoàn tất!",
      "Kết quả đánh giá truyện đã có.",
    );
  } catch (error) {
    console.error("Lỗi khi đánh giá:", error);
    showStatus(`Lỗi đánh giá: ${error.message}`, false);
  } finally {
    toggleActionButtons(false);
  }
}

function parseStoryMetadataResponse(rawText) {
  if (typeof rawText !== "string") {
    return { icon: "", title: "", genre: "" };
  }

  const parseJson = (jsonText) => {
    try {
      const parsed = JSON.parse(jsonText);
      return {
        icon: typeof parsed.icon === "string" ? parsed.icon.trim() : "",
        title: typeof parsed.title === "string" ? parsed.title.trim() : "",
        genre: typeof parsed.genre === "string" ? parsed.genre.trim() : "",
      };
    } catch {
      return null;
    }
  };

  const direct = parseJson(rawText.trim());
  if (direct) return direct;

  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return parseJson(cleaned) || { icon: "", title: "", genre: "" };
}

export async function handleGenerateStoryMetadata() {
  const translatedContent = resolveTranslatedContent(
    state.translatedContent,
    dom.translatedOutput?.textContent,
  );

  if (!translatedContent || state.currentFileType === "srt") {
    showStatus("Tính năng này chỉ dùng cho nội dung truyện đã dịch.", false);
    return;
  }

  if (!state.translatedContent) {
    state.translatedContent = translatedContent;
  }

  const userTitle = dom.storyTitleInput?.value.trim() || "";
  const userGenre = dom.storyGenreInput?.value.trim() || "";

  toggleActionButtons(true);
  if (dom.generateStoryMetadataBtn) {
    dom.generateStoryMetadataBtn.disabled = true;
  }

  try {
    showStatus("Đang tạo icon và tiêu đề chuẩn audio...", true);
    const prompt = storyMetadataPromptTemplate
      .replace("{user_title}", userTitle || "(trống)")
      .replace("{user_genre}", userGenre || "(trống)")
      .replace("{story_text}", translatedContent.substring(0, 8000));
    const response = await translateTextAI("", prompt);
    const parsed = parseStoryMetadataResponse(response);
    const resolved = resolveStoryTitleGenre({
      userTitle,
      userGenre,
      aiTitle: parsed.title,
      aiGenre: parsed.genre,
      titleSuggestions: state.titleSuggestionsContent,
    });

    state.storyIcon = normalizeStoryIcon(parsed.icon);
    state.customStoryTitle = resolved.title;
    state.customStoryGenre = resolved.genre;
    state.customStoryDescription = "";
    state.favoriteTitle = buildAudioFavoriteTitle(
      state.customStoryGenre,
      state.customStoryTitle,
      state.storyIcon,
    );
    state.historySavedForCurrentTranslation = false;

    renderTitleSuggestions(state.titleSuggestionsContent);

    if (dom.storyTitleInput) {
      dom.storyTitleInput.value = state.customStoryTitle;
    }
    if (dom.storyGenreInput) {
      dom.storyGenreInput.value = state.customStoryGenre;
    }
    if (dom.storyMetadataOutput) {
      dom.storyMetadataOutput.textContent = state.favoriteTitle;
    }

    pushConversationMessage({
      role: "assistant",
      type: "story_metadata_generated",
      content: {
        icon: state.storyIcon,
        title: state.customStoryTitle,
        genre: state.customStoryGenre,
        favoriteTitle: state.favoriteTitle,
      },
    });

    showStatus("Đã tạo tiêu đề chuẩn và icon.", false);
  } catch (error) {
    console.error("Lỗi tạo metadata truyện:", error);
    showStatus(`Lỗi tạo metadata: ${error.message}`, false);
  } finally {
    toggleActionButtons(false);
    if (dom.generateStoryMetadataBtn) {
      dom.generateStoryMetadataBtn.disabled = false;
    }
    updateTranslateButtonState();
  }
}

export async function handleCleanTranslatedContent() {
  const translatedContent = resolveTranslatedContent(
    state.translatedContent,
    dom.translatedOutput?.textContent,
  );

  if (!translatedContent) {
    showStatus("Chưa có bản dịch để làm sạch.", false);
    return;
  }

  const cleanedContent = cleanTranslatedContent(translatedContent);
  if (!cleanedContent) {
    showStatus("Không có nội dung hợp lệ để làm sạch.", false);
    return;
  }

  state.cleanedContent = cleanedContent;
  if (dom.cleanedOutput) {
    dom.cleanedOutput.textContent = cleanedContent;
  }
  if (dom.cleanedOutputArea) {
    dom.cleanedOutputArea.classList.remove("hidden");
  }

  state.historySavedForCurrentTranslation = false;
  pushConversationMessage({
    role: "system",
    type: "translated_content_cleaned",
    content: {
      beforeLength: translatedContent.length,
      afterLength: cleanedContent.length,
    },
  });

  showStatus("Đã tạo bản làm sạch (không thay đổi bản gốc).", false);
}

export async function handleGenerateSeoTags() {
  const translatedContent = resolveTranslatedContent(
    state.translatedContent,
    dom.translatedOutput?.textContent,
  );

  if (!translatedContent || state.currentFileType === "srt") {
    showStatus("Chỉ hỗ trợ tạo thẻ SEO cho truyện đã dịch.", false);
    return;
  }

  const storyTitle =
    state.customStoryTitle ||
    state.favoriteTitle ||
    state.pendingHistoryFileName;

  toggleActionButtons(true);
  try {
    showStatus("Đang tạo thẻ từ khóa SEO YouTube...", true);
    const prompt = seoTagsPromptTemplate
      .replace("{story_text}", translatedContent.substring(0, 8000))
      .replace("{story_title}", storyTitle || "(không rõ)")
      .replace("{channel_name}", "Trần Thiên Minh")
      .replace("{max_chars}", String(DEFAULT_SEO_TAGS_MAX_CHARS));

    const seoTags = normalizeSeoTagsOutput(
      await translateTextAI("", prompt),
      DEFAULT_SEO_TAGS_MAX_CHARS,
    );
    state.seoTagsContent = seoTags;
    state.historySavedForCurrentTranslation = false;

    if (dom.seoTagsOutput) {
      dom.seoTagsOutput.textContent = seoTags;
    }
    if (dom.seoTagsArea) {
      dom.seoTagsArea.classList.remove("hidden");
    }

    pushConversationMessage({
      role: "assistant",
      type: "seo_tags_generated",
      content: seoTags,
    });

    showStatus("Đã tạo thẻ từ khóa SEO YouTube.", false);
  } catch (error) {
    console.error("Lỗi tạo thẻ SEO:", error);
    showStatus(`Lỗi tạo thẻ SEO: ${error.message}`, false);
  } finally {
    toggleActionButtons(false);
    updateTranslateButtonState();
  }
}

export async function handleGenerateStoryQuiz() {
  const translatedContent = resolveTranslatedContent(
    state.translatedContent,
    dom.translatedOutput?.textContent,
  );

  if (!translatedContent || state.currentFileType === "srt") {
    showStatus("Chỉ hỗ trợ tạo câu hỏi cho truyện đã dịch.", false);
    return;
  }

  toggleActionButtons(true);
  try {
    showStatus("Đang tạo câu hỏi ngắn theo nội dung truyện...", true);
    const prompt = storyQuizPromptTemplate.replace(
      "{story_text}",
      translatedContent.substring(0, 8000),
    );

    const quiz = (await translateTextAI("", prompt)).trim();
    state.storyQuizContent = quiz;
    state.historySavedForCurrentTranslation = false;

    if (dom.storyQuizOutput) {
      dom.storyQuizOutput.textContent = quiz;
    }
    if (dom.storyQuizArea) {
      dom.storyQuizArea.classList.remove("hidden");
    }

    pushConversationMessage({
      role: "assistant",
      type: "story_quiz_generated",
      content: quiz,
    });

    showStatus("Đã tạo câu hỏi ngắn và đáp án.", false);
  } catch (error) {
    console.error("Lỗi tạo câu hỏi truyện:", error);
    showStatus(`Lỗi tạo câu hỏi: ${error.message}`, false);
  } finally {
    toggleActionButtons(false);
    updateTranslateButtonState();
  }
}

export async function handleSaveCurrentNodeChanges() {
  if (!state.translatedContent?.trim()) {
    showStatus("Chưa có nội dung để lưu.", false);
    return;
  }

  if (!state.currentFileType) {
    showStatus("Không xác định được loại dữ liệu để lưu.", false);
    return;
  }

  try {
    toggleActionButtons(true);
    showStatus("Đang lưu thay đổi node...", true);

    const nextIdentity = resolveStorageIdentityForManualSave(
      dom.storageIdInput?.value || "",
      {
        currentId: state.currentStorageId,
        fallbackName: state.pendingHistoryFileName || "Văn bản đã dán",
      },
    );
    state.currentStorageId = nextIdentity.id;
    state.currentSourceUrl = nextIdentity.sourceUrl;

    await saveToHistory(
      state.currentFileType,
      state.pendingHistoryFileName || "Văn bản đã dán",
      state.translatedContent,
      state.originalContent,
      {
        id: state.currentStorageId,
        sourceUrl: state.currentSourceUrl,
        titleSuggestions: state.titleSuggestionsContent,
        storyDescription: state.storyDescriptionContent,
        favoriteTitle: state.favoriteTitle,
        conversation: getConversationPayload(),
        storyIcon: state.storyIcon,
        customStoryTitle: state.customStoryTitle,
        customStoryGenre: state.customStoryGenre,
        customStoryDescription: state.customStoryDescription,
        storageLabel: state.currentStorageLabel,
        cleanedContent: state.cleanedContent,
        seoTags: state.seoTagsContent,
        storyQuiz: state.storyQuizContent,
        isCompleted: state.currentRecordCompleted,
        isDraft: false,
      },
    );

    state.historySavedForCurrentTranslation = true;
    showStatus("Đã lưu thay đổi node thành công.", false);
  } catch (error) {
    console.error("Lỗi lưu thay đổi node:", error);
    showStatus(`Lỗi lưu node: ${error.message}`, false);
  } finally {
    toggleActionButtons(false);
    updateTranslateButtonState();
  }
}

export async function handleStoryQa() {
  const question = dom.qaQuestionInput.value.trim();
  if (!question) {
    showStatus("Vui lòng nhập câu hỏi.", false);
    return;
  }

  if (state.currentFileType === "srt") {
    showStatus("Chỉ hỗ trợ hỏi đáp cho nội dung truyện.", false);
    return;
  }

  showStatus("Đang chuẩn bị nội dung...", true);
  try {
    const storyText = await getStoryContentFromInput();
    if (!storyText.trim()) {
      showStatus("Không có nội dung truyện để hỏi đáp.", false);
      return;
    }

    toggleActionButtons(true);
    dom.qaAnswerOutput.textContent = "";
    showStatus("AI đang trả lời câu hỏi...", true);

    pushConversationMessage({
      role: "user",
      type: "qa_question",
      content: question,
    });

    const prompt = buildQaPrompt(storyQaPromptTemplate, question).replace(
      "{story_text}",
      storyText,
    );

    state.qaAnswerContent = await translateTextAI("", prompt);
    dom.qaAnswerOutput.textContent = state.qaAnswerContent;
    pushConversationMessage({
      role: "assistant",
      type: "qa_answer",
      content: state.qaAnswerContent,
    });

    showStatus("Đã có câu trả lời!", false);
    showBrowserNotification("Hỏi đáp hoàn tất!", "Câu trả lời đã sẵn sàng.");
  } catch (error) {
    console.error("Lỗi khi hỏi đáp:", error);
    showStatus(`Lỗi hỏi đáp: ${error.message}`, false);
  } finally {
    toggleActionButtons(false);
    updateTranslateButtonState();
  }
}
