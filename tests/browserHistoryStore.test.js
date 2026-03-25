import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyHistory,
  normalizeHistory,
  upsertHistoryEntry,
  setHistoryEntryCompleted,
  setHistoryEntryLabel,
  deleteHistoryEntry,
  getHistoryStats,
  parseImportedHistory,
  loadHistoryFromBrowserStorage,
  saveHistoryToBrowserStorage,
} from "../src/js/utils/browserHistoryStore.js";

test("createEmptyHistory returns default shape", () => {
  assert.deepEqual(createEmptyHistory(), { docx: [], srt: [] });
});

test("upsertHistoryEntry prepends and replaces by id", () => {
  const history = {
    docx: [
      { id: "story-1", name: "Old" },
      { id: "story-2", name: "Another" },
    ],
    srt: [],
  };

  const result = upsertHistoryEntry(history, "docx", {
    id: "story-1",
    name: "Updated",
    content: "x",
  });

  assert.equal(result.docx.length, 2);
  assert.equal(result.docx[0].id, "story-1");
  assert.equal(result.docx[0].name, "Updated");
});

test("setHistoryEntryCompleted and setHistoryEntryLabel update target", () => {
  const history = {
    docx: [{ id: "a", name: "A", isCompleted: false, storageLabel: "" }],
    srt: [],
  };

  const completed = setHistoryEntryCompleted(history, "docx", 0, true);
  const labeled = setHistoryEntryLabel(completed, "docx", 0, "Nháp cần sửa");

  assert.equal(labeled.docx[0].isCompleted, true);
  assert.equal(labeled.docx[0].storageLabel, "Nháp cần sửa");
});

test("deleteHistoryEntry removes item by index", () => {
  const history = {
    docx: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
    srt: [],
  };

  const result = deleteHistoryEntry(history, "docx", 0);
  assert.equal(result.docx.length, 1);
  assert.equal(result.docx[0].id, "b");
});

test("getHistoryStats counts translated stories and srt breakdown", () => {
  const stats = getHistoryStats({
    docx: [
      { name: "draft", isDraft: true, isCompleted: false },
      { name: "done", isDraft: false, isCompleted: true },
      { name: "todo", isDraft: false, isCompleted: false },
    ],
    srt: [{ name: "sub", isCompleted: true }],
  });

  assert.equal(stats.totalCount, 2);
  assert.equal(stats.completedCount, 1);
  assert.equal(stats.pendingCount, 1);
  assert.equal(stats.byType.srt.totalCount, 1);
  assert.equal(stats.byType.srt.completedCount, 1);
});

test("parseImportedHistory supports legacy array format", () => {
  const imported = parseImportedHistory([{ name: "Legacy", content: "..." }]);
  assert.equal(imported.docx.length, 1);
  assert.equal(imported.srt.length, 0);
});

test("save/load history with storage adapter", () => {
  const storage = {
    data: new Map(),
    getItem(key) {
      return this.data.has(key) ? this.data.get(key) : null;
    },
    setItem(key, value) {
      this.data.set(key, value);
    },
  };

  const saved = saveHistoryToBrowserStorage(
    normalizeHistory({ docx: [{ id: "x", name: "Story X" }], srt: [] }),
    storage,
  );

  const loaded = loadHistoryFromBrowserStorage(storage);

  assert.equal(saved.docx.length, 1);
  assert.equal(loaded.docx.length, 1);
  assert.equal(loaded.docx[0].id, "x");
});
