import test from "node:test";
import assert from "node:assert/strict";
import {
  isManagedHistoryFile,
  buildHistoryFileName,
  parseSingleHistoryFileContent,
  sortEntriesByDateDesc,
} from "../src/js/utils/historyFileStore.js";

test("isManagedHistoryFile detects managed filenames", () => {
  assert.equal(isManagedHistoryFile("docx__abc.json"), true);
  assert.equal(isManagedHistoryFile("srt__abc.json"), true);
  assert.equal(isManagedHistoryFile("history.json"), false);
});

test("buildHistoryFileName builds deterministic managed filename", () => {
  const fileName = buildHistoryFileName("docx", {
    id: "https://example.com/story?id=1",
  });

  assert.equal(fileName.startsWith("docx__"), true);
  assert.equal(fileName.endsWith(".json"), true);
});

test("parseSingleHistoryFileContent parses wrapped entry format", () => {
  const parsed = parseSingleHistoryFileContent(
    JSON.stringify({ type: "docx", entry: { id: "1", name: "A" } }),
    "docx__1.json",
  );

  assert.equal(parsed.docx.length, 1);
  assert.equal(parsed.srt.length, 0);
  assert.equal(parsed.docx[0].id, "1");
});

test("parseSingleHistoryFileContent parses legacy object format", () => {
  const parsed = parseSingleHistoryFileContent(
    JSON.stringify({ docx: [{ id: "1" }], srt: [{ id: "2" }] }),
    "legacy.json",
  );

  assert.equal(parsed.docx.length, 1);
  assert.equal(parsed.srt.length, 1);
});

test("sortEntriesByDateDesc sorts by descending date", () => {
  const sorted = sortEntriesByDateDesc([
    { id: "old", date: "2023-01-01T00:00:00.000Z", name: "old" },
    { id: "new", date: "2024-01-01T00:00:00.000Z", name: "new" },
  ]);

  assert.equal(sorted[0].id, "new");
  assert.equal(sorted[1].id, "old");
});
