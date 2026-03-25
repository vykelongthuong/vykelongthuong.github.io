import { dom } from "../ui/dom.js";
import { state } from "../state.js";
import { buildHistoryEntry } from "../utils/historyEntry.js";
import {
  normalizeSourceUrl,
  findDuplicateSourceUrl,
} from "../utils/sourceUrl.js";
import {
  isApproximateNameMatch,
  isExactUrlMatch,
} from "../utils/historySearch.js";
import {
  extractAudioGenreGroupKey,
  getAvailableStoryGroups,
  isStoryGroupMatch,
  sortRecordsByStoryGroup,
} from "../utils/historySort.js";
import {
  buildStoryGroupSelectOptions,
  resolveStoryGroupSelection,
} from "../utils/historyGroupFilter.js";
import {
  filterRecordsByCompletedVisibility,
  getCompletedVisibilityButtonText,
} from "../utils/historyVisibility.js";
import {
  FRONTEND_HISTORY_LABEL,
  getHistoryStats,
  loadHistoryFromBrowserStorage,
  saveHistoryToBrowserStorage,
  upsertHistoryEntry,
  setHistoryEntryCompleted,
  setHistoryEntryLabel,
  deleteHistoryEntry,
  parseImportedHistory,
} from "../utils/browserHistoryStore.js";

let storyHistoryCache = [];
let subtitleHistoryCache = [];
let activeStorageRecords = [];
let activeStorageRecordKey = "";
let isStorageNodeCompact = false;
let isCompletedHidden = false;

function normalizeStorageLabel(value = "") {
  return String(value || "")
    .trim()
    .slice(0, 60);
}

function getHistoryObject() {
  return {
    docx: storyHistoryCache,
    srt: subtitleHistoryCache,
  };
}

function setHistoryStatsUI(stats = {}) {
  const total = Number.isFinite(stats.totalCount) ? stats.totalCount : 0;
  const done = Number.isFinite(stats.completedCount) ? stats.completedCount : 0;
  const pending = Number.isFinite(stats.pendingCount)
    ? stats.pendingCount
    : Math.max(total - done, 0);

  if (dom.historyStatsTotal) {
    dom.historyStatsTotal.textContent = String(total);
  }
  if (dom.historyStatsDone) {
    dom.historyStatsDone.textContent = String(done);
  }
  if (dom.historyStatsPending) {
    dom.historyStatsPending.textContent = String(pending);
  }
}

function setHistoryFilePathUI(filePath = "") {
  if (!dom.historyFilePathLabel) return;
  dom.historyFilePathLabel.textContent = filePath || "(chưa có)";
}

function persistHistory(nextHistory) {
  const normalized = saveHistoryToBrowserStorage(nextHistory);
  storyHistoryCache = Array.isArray(normalized.docx) ? normalized.docx : [];
  subtitleHistoryCache = Array.isArray(normalized.srt) ? normalized.srt : [];
}

function getUnifiedRecords() {
  return [...storyHistoryCache, ...subtitleHistoryCache];
}

function getSelectedStoryGroup() {
  const rawValue = (dom.historyGroupFilterSelect?.value || "").trim();
  if (!rawValue) return "";
  return rawValue;
}

function renderStoryGroupFilterOptions(records = []) {
  if (!dom.historyGroupFilterSelect) return;

  const groups = getAvailableStoryGroups(records);
  const currentValue = (dom.historyGroupFilterSelect?.value || "").trim();
  const options = buildStoryGroupSelectOptions(groups);

  dom.historyGroupFilterSelect.innerHTML = options
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join("");

  dom.historyGroupFilterSelect.value = resolveStoryGroupSelection(
    currentValue,
    groups,
  );
}

function setStorageCompactButtonUI() {
  if (!dom.toggleStorageCompactBtn) return;
  dom.toggleStorageCompactBtn.textContent = isStorageNodeCompact
    ? "Phóng to node"
    : "Thu nhỏ node";
}

function setCompletedVisibilityButtonUI() {
  if (!dom.toggleCompletedVisibilityBtn) return;
  dom.toggleCompletedVisibilityBtn.textContent =
    getCompletedVisibilityButtonText(isCompletedHidden);
}

export function toggleStorageNodeCompactMode() {
  isStorageNodeCompact = !isStorageNodeCompact;
  setStorageCompactButtonUI();
  renderStorageRecords();
}

export function toggleCompletedVisibilityMode() {
  isCompletedHidden = !isCompletedHidden;
  setCompletedVisibilityButtonUI();
  renderStorageRecords();
}

function getFilteredRecords(records = []) {
  const visibleRecords = filterRecordsByCompletedVisibility(
    records,
    isCompletedHidden,
  );
  const nameQuery = dom.historySearchNameInput?.value || "";
  const urlQuery = dom.historySearchUrlInput?.value || "";

  const selectedGroup = getSelectedStoryGroup();

  const filtered = visibleRecords.filter((item) => {
    const searchableName = item.name || item.fileName || "";
    return (
      isApproximateNameMatch(searchableName, nameQuery) &&
      isExactUrlMatch(item.sourceUrl || "", urlQuery) &&
      isStoryGroupMatch(item, selectedGroup)
    );
  });

  return sortRecordsByStoryGroup(filtered);
}

function buildRecordKey(type, id) {
  return `${type}:${id}`;
}

function getRecordMetaByKey(recordKey) {
  const [type, ...idParts] = (recordKey || "").split(":");
  const id = idParts.join(":");
  if (!type || !id) return null;

  const list = type === "docx" ? storyHistoryCache : subtitleHistoryCache;
  const index = list.findIndex((item) => (item.id || item.name) === id);
  if (index < 0) return null;

  return {
    type,
    id,
    index,
    item: list[index],
  };
}

function renderStoredTitleSuggestions(titles = []) {
  dom.titleSuggestionOutput.innerHTML = "";
  if (!Array.isArray(titles) || titles.length === 0) {
    dom.titleSuggestionArea.classList.add("hidden");
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

  dom.titleSuggestionArea.classList.remove("hidden");
}

function loadHistoryItem(item, type) {
  if (!item) return;

  state.currentFileType = type;
  state.translatedContent = item.content;
  state.originalContent = item.original;
  state.titleSuggestionsContent = Array.isArray(item.titleSuggestions)
    ? item.titleSuggestions
    : [];
  state.storyDescriptionContent =
    typeof item.storyDescription === "string" ? item.storyDescription : "";
  state.cleanedContent =
    typeof item.cleanedContent === "string" ? item.cleanedContent : "";
  state.seoTagsContent = typeof item.seoTags === "string" ? item.seoTags : "";
  state.storyQuizContent =
    typeof item.storyQuiz === "string" ? item.storyQuiz : "";
  state.storyIcon = typeof item.storyIcon === "string" ? item.storyIcon : "";
  state.customStoryTitle =
    typeof item.customStoryTitle === "string" ? item.customStoryTitle : "";
  state.customStoryGenre =
    typeof item.customStoryGenre === "string" ? item.customStoryGenre : "";
  state.customStoryDescription =
    typeof item.customStoryDescription === "string"
      ? item.customStoryDescription
      : "";
  state.favoriteTitle =
    typeof item.favoriteTitle === "string" ? item.favoriteTitle : "";
  state.pendingHistoryFileName = item.fileName || item.name || "Văn bản đã dán";
  state.historySavedForCurrentTranslation = true;
  state.currentStorageId = typeof item.id === "string" ? item.id : "";
  state.currentSourceUrl =
    typeof item.sourceUrl === "string" ? item.sourceUrl : "";
  state.currentConversationLog = Array.isArray(item.conversation)
    ? item.conversation
    : [];
  state.currentRecordCompleted = Boolean(item.isCompleted);
  state.currentStorageLabel =
    typeof item.storageLabel === "string" ? item.storageLabel : "";
  state.isEditingExistingHistoryNode = true;

  if (dom.storageIdInput) {
    dom.storageIdInput.value = state.currentSourceUrl || state.currentStorageId;
    validateStorageSourceInput(dom.storageIdInput.value, {
      ignoreId: state.currentStorageId,
    });
  }

  dom.translatedOutput.textContent = state.translatedContent;

  if (dom.storyTitleInput) {
    dom.storyTitleInput.value = state.customStoryTitle;
  }
  if (dom.storyGenreInput) {
    dom.storyGenreInput.value = state.customStoryGenre;
  }
  if (dom.storyMetadataOutput) {
    dom.storyMetadataOutput.textContent = state.favoriteTitle || "";
  }
  if (dom.cleanedOutput) {
    dom.cleanedOutput.textContent = state.cleanedContent;
  }
  if (dom.cleanedOutputArea) {
    dom.cleanedOutputArea.classList.toggle("hidden", !state.cleanedContent);
  }
  if (dom.seoTagsOutput) {
    dom.seoTagsOutput.textContent = state.seoTagsContent;
  }
  if (dom.seoTagsArea) {
    dom.seoTagsArea.classList.toggle("hidden", !state.seoTagsContent);
  }
  if (dom.storyQuizOutput) {
    dom.storyQuizOutput.textContent = state.storyQuizContent;
  }
  if (dom.storyQuizArea) {
    dom.storyQuizArea.classList.toggle("hidden", !state.storyQuizContent);
  }

  dom.resultArea.classList.remove("hidden");
  dom.addCommentBtn.classList.remove("hidden");
  dom.evaluateBtn.classList.remove("hidden");

  if (type === "docx") {
    renderStoredTitleSuggestions(state.titleSuggestionsContent);
    dom.storyDescriptionOutput.textContent = state.storyDescriptionContent;
    dom.storyDescriptionArea.classList.toggle(
      "hidden",
      !state.storyDescriptionContent,
    );
  } else {
    dom.titleSuggestionArea.classList.add("hidden");
    dom.titleSuggestionOutput.innerHTML = "";
    dom.storyDescriptionArea.classList.add("hidden");
    dom.storyDescriptionOutput.textContent = "";
  }

  dom.commentSection.classList.add("hidden");
  dom.evaluationResultArea.classList.add("hidden");
}

function renderStorageRecords() {
  if (!dom.storageRecordList) return;

  activeStorageRecords = getFilteredRecords(getUnifiedRecords());
  dom.storageRecordList.innerHTML = "";

  if (activeStorageRecords.length === 0) {
    dom.storageRecordList.innerHTML =
      '<p class="text-sm text-slate-500">Không có bản ghi phù hợp bộ lọc.</p>';
    activeStorageRecordKey = "";
    if (dom.historyResultCountLabel) {
      dom.historyResultCountLabel.textContent = "0 kết quả";
    }
    return;
  }

  if (dom.historyResultCountLabel) {
    dom.historyResultCountLabel.textContent = `${activeStorageRecords.length} kết quả`;
  }

  const selected =
    activeStorageRecords.find((item) => {
      const type = storyHistoryCache.includes(item) ? "docx" : "srt";
      const id = item.id || item.name;
      return buildRecordKey(type, id) === activeStorageRecordKey;
    }) || activeStorageRecords[0];

  const selectedType = storyHistoryCache.includes(selected) ? "docx" : "srt";
  activeStorageRecordKey = buildRecordKey(
    selectedType,
    selected.id || selected.name,
  );

  let previousGroupKey = "";

  activeStorageRecords.forEach((item) => {
    const id = item.id || item.name;
    const type = storyHistoryCache.includes(item) ? "docx" : "srt";
    const isSelected = buildRecordKey(type, id) === activeStorageRecordKey;

    const currentGroupKey = extractAudioGenreGroupKey(item) || "khác";
    if (currentGroupKey !== previousGroupKey) {
      const groupDivider = document.createElement("div");
      groupDivider.className =
        "pt-1 pb-0.5 text-[10px] uppercase tracking-wide text-sky-300/80";
      groupDivider.textContent = `Nhóm: ${currentGroupKey}`;
      dom.storageRecordList.appendChild(groupDivider);
      previousGroupKey = currentGroupKey;
    }

    const row = document.createElement("div");
    row.className = `history-record-card p-2.5 rounded-lg border transition-colors overflow-hidden ${
      isSelected
        ? "border-sky-500 bg-slate-900/80"
        : "border-slate-700 hover:border-sky-500 hover:bg-slate-900/50"
    }`;

    const completeBtnTitle = item.isCompleted ? "Bỏ đã làm" : "Đánh dấu đã làm";
    const completeBtnClass = item.isCompleted
      ? "bg-slate-700 hover:bg-slate-600"
      : "bg-emerald-700 hover:bg-emerald-600";

    const storageLabel = normalizeStorageLabel(item.storageLabel || "");
    const titleText = item.name || "(không tên)";

    row.innerHTML = `
      <div class="space-y-2">
        <div class="flex items-start gap-2 min-w-0">
          <button type="button" data-storage-record-id="${id}" data-storage-record-type="${type}" class="flex-1 text-left min-w-0 pr-1 space-y-1">
            ${storageLabel ? `<div class="text-[12px] font-semibold text-indigo-300 leading-4 break-words">🏷 ${storageLabel}</div>` : ""}
            <div class="text-[13px] font-semibold text-slate-100 leading-4 break-words">${titleText}</div>
            ${isStorageNodeCompact ? "" : `<div class=\"text-[11px] text-slate-500 mt-1\">${item.date || ""}</div>`}
          </button>
          <div class="flex items-center gap-1 shrink-0">
            <button type="button" title="Gắn nhãn" data-storage-label-id="${id}" data-storage-label-type="${type}" class="h-7 w-7 rounded-md bg-indigo-700 text-white hover:bg-indigo-600 text-xs flex items-center justify-center">
              <i class="fa-solid fa-tag"></i>
            </button>
            <button type="button" title="${completeBtnTitle}" data-storage-completed-id="${id}" data-storage-completed-type="${type}" data-storage-completed-value="${item.isCompleted ? "0" : "1"}" class="h-7 w-7 rounded-md ${completeBtnClass} text-white text-xs flex items-center justify-center">
              <i class="fa-solid ${item.isCompleted ? "fa-rotate-left" : "fa-check"}"></i>
            </button>
            <button type="button" title="Xóa" data-storage-delete-id="${id}" data-storage-delete-type="${type}" class="h-7 w-7 rounded-md bg-rose-700 text-white hover:bg-rose-600 text-xs flex items-center justify-center">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
        ${
          isStorageNodeCompact
            ? ""
            : `
          <div class=\"flex items-center gap-2 text-[10px] flex-wrap\">
            ${item.isCompleted ? '<span class=\"px-2 py-0.5 rounded-full bg-emerald-700/80 text-white\">Đã làm</span>' : ""}
            ${item.isDraft ? '<span class=\"px-2 py-0.5 rounded-full bg-amber-700/80 text-white\">Nháp</span>' : ""}
          </div>
        `
        }
      </div>
    `;

    dom.storageRecordList.appendChild(row);
  });
}

export function validateStorageSourceInput(rawValue = "", options = {}) {
  if (!dom.storageIdMessage) return;

  const ignoreId =
    typeof options.ignoreId === "string"
      ? options.ignoreId
      : state.currentStorageId;
  const normalizedInput = normalizeSourceUrl(rawValue);
  if (!rawValue.trim()) {
    dom.storageIdMessage.textContent = "";
    dom.storageIdMessage.className = "text-xs text-slate-400 mt-1";
    return;
  }

  if (!normalizedInput) {
    dom.storageIdMessage.textContent =
      "Cần URL hợp lệ (http/https). Không thể dịch nếu chỉ nhập ID tùy chỉnh.";
    dom.storageIdMessage.className = "text-xs text-amber-400 mt-1";
    return;
  }

  const duplicate = findDuplicateSourceUrl(
    getUnifiedRecords(),
    rawValue,
    ignoreId,
  );
  if (duplicate) {
    dom.storageIdMessage.textContent = `URL đã tồn tại trong lưu trữ: ${duplicate.name || duplicate.fileName || duplicate.id}`;
    dom.storageIdMessage.className = "text-xs text-rose-400 mt-1";
    return;
  }

  dom.storageIdMessage.textContent = "URL hợp lệ, có thể dùng để bắt đầu dịch.";
  dom.storageIdMessage.className = "text-xs text-emerald-400 mt-1";
}

async function deleteHistoryRecord(type, index) {
  persistHistory(deleteHistoryEntry(getHistoryObject(), type, index));
  await renderHistory();
}

async function updateHistoryRecordCompleted(type, index, isCompleted) {
  persistHistory(
    setHistoryEntryCompleted(getHistoryObject(), type, index, isCompleted),
  );
  await renderHistory();
}

async function updateHistoryRecordLabel(type, index, storageLabel) {
  persistHistory(
    setHistoryEntryLabel(
      getHistoryObject(),
      type,
      index,
      normalizeStorageLabel(storageLabel),
    ),
  );
  await renderHistory();
}

function pickJsonFileFromBrowser() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";

    input.addEventListener("change", () => {
      const file = input.files?.[0] || null;
      input.remove();
      resolve(file);
    });

    document.body.appendChild(input);
    input.click();
  });
}

export async function importHistoryFromJsonText(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("File JSON không hợp lệ.");
  }

  persistHistory(parseImportedHistory(parsed));
  await renderHistory();
}

export async function pickAndImportHistoryFile() {
  const file = await pickJsonFileFromBrowser();
  if (!file) {
    return { cancelled: true };
  }

  const text = await file.text();
  await importHistoryFromJsonText(text);
  return { cancelled: false, directoryPath: FRONTEND_HISTORY_LABEL };
}

export async function pickHistoryStorageDirectory() {
  return { cancelled: true, directoryPath: FRONTEND_HISTORY_LABEL };
}

export async function saveToHistory(
  type,
  fileName,
  content,
  original,
  metadata = {},
) {
  const entry = buildHistoryEntry({
    fileName,
    content,
    original,
    id: metadata.id,
    sourceUrl: metadata.sourceUrl,
    titleSuggestions: metadata.titleSuggestions,
    storyDescription: metadata.storyDescription,
    favoriteTitle: metadata.favoriteTitle,
    conversation: metadata.conversation,
    storyIcon: metadata.storyIcon,
    customStoryTitle: metadata.customStoryTitle,
    customStoryGenre: metadata.customStoryGenre,
    customStoryDescription: metadata.customStoryDescription,
    storageLabel: metadata.storageLabel,
    cleanedContent: metadata.cleanedContent,
    seoTags: metadata.seoTags,
    storyQuiz: metadata.storyQuiz,
    isCompleted: metadata.isCompleted,
    isDraft: metadata.isDraft,
  });

  persistHistory(upsertHistoryEntry(getHistoryObject(), type, entry));
  await renderHistory();
}

export async function renderHistory() {
  setStorageCompactButtonUI();
  setCompletedVisibilityButtonUI();

  const history = loadHistoryFromBrowserStorage();
  storyHistoryCache = Array.isArray(history.docx) ? history.docx : [];
  subtitleHistoryCache = Array.isArray(history.srt) ? history.srt : [];

  const stats = getHistoryStats(history);
  setHistoryStatsUI(stats);
  setHistoryFilePathUI(FRONTEND_HISTORY_LABEL);

  renderStoryGroupFilterOptions(getUnifiedRecords());
  renderStorageRecords();
  validateStorageSourceInput(dom.storageIdInput?.value || "");
}

export function applyHistorySearchFilter() {
  renderStorageRecords();
}

export async function handleStorageRecordClick(event) {
  const completedTarget = event.target.closest("[data-storage-completed-id]");
  if (completedTarget) {
    const id = completedTarget.dataset.storageCompletedId || "";
    const type = completedTarget.dataset.storageCompletedType || "";
    const isCompleted = completedTarget.dataset.storageCompletedValue === "1";
    const recordKey = buildRecordKey(type, id);
    const recordMeta = getRecordMetaByKey(recordKey);
    if (!recordMeta) return;

    try {
      await updateHistoryRecordCompleted(
        recordMeta.type,
        recordMeta.index,
        isCompleted,
      );
      if (
        state.currentStorageId &&
        state.currentStorageId === recordMeta.item.id
      ) {
        state.currentRecordCompleted = isCompleted;
      }
    } catch (error) {
      console.error("Không thể cập nhật trạng thái đã làm:", error);
    }
    return;
  }

  const labelTarget = event.target.closest("[data-storage-label-id]");
  if (labelTarget) {
    const id = labelTarget.dataset.storageLabelId || "";
    const type = labelTarget.dataset.storageLabelType || "";
    const recordKey = buildRecordKey(type, id);
    const recordMeta = getRecordMetaByKey(recordKey);
    if (!recordMeta) return;

    const currentLabel = normalizeStorageLabel(
      recordMeta.item.storageLabel || "",
    );
    const nextLabel = window.prompt(
      "Nhập nhãn dán cho node (tối đa 60 ký tự):",
      currentLabel,
    );
    if (nextLabel === null) return;

    try {
      await updateHistoryRecordLabel(
        recordMeta.type,
        recordMeta.index,
        nextLabel,
      );
      if (
        state.currentStorageId &&
        state.currentStorageId === recordMeta.item.id
      ) {
        state.currentStorageLabel = normalizeStorageLabel(nextLabel);
      }
    } catch (error) {
      console.error("Không thể cập nhật nhãn dán:", error);
    }
    return;
  }

  const deleteTarget = event.target.closest("[data-storage-delete-id]");
  if (deleteTarget) {
    const id = deleteTarget.dataset.storageDeleteId || "";
    const type = deleteTarget.dataset.storageDeleteType || "";
    const recordKey = buildRecordKey(type, id);
    const recordMeta = getRecordMetaByKey(recordKey);
    if (!recordMeta) return;

    const recordName =
      recordMeta.item.name || recordMeta.item.fileName || recordMeta.id;
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa bản lưu "${recordName}"?`,
    );
    if (!confirmed) return;

    try {
      await deleteHistoryRecord(recordMeta.type, recordMeta.index);
    } catch (error) {
      console.error("Không thể xóa bản lưu:", error);
    }
    return;
  }

  const target = event.target.closest("[data-storage-record-id]");
  if (!target) return;

  const id = target.dataset.storageRecordId || "";
  const type = target.dataset.storageRecordType || "";
  const recordKey = buildRecordKey(type, id);
  const recordMeta = getRecordMetaByKey(recordKey);
  if (!recordMeta) return;

  activeStorageRecordKey = recordKey;
  renderStorageRecords();
  loadHistoryItem(recordMeta.item, recordMeta.type);
}
