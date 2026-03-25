import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeManualChunks,
  getManualChunksForEditor,
  mergeManualChunksForContext,
  hasManualChunks,
} from "../src/js/utils/manualChunks.js";

test("normalizeManualChunks keeps non-empty trimmed chunks", () => {
  const result = normalizeManualChunks(["  doan 1  ", "", "   ", "doan 2"]);
  assert.deepEqual(result, ["doan 1", "doan 2"]);
});

test("getManualChunksForEditor keeps raw editor rows and fallback row", () => {
  assert.deepEqual(getManualChunksForEditor([]), [""]);
  assert.deepEqual(getManualChunksForEditor(["A", ""]), ["A", ""]);
});

test("mergeManualChunksForContext joins chunks by separator", () => {
  const result = mergeManualChunksForContext(["A", "B"]);
  assert.equal(result, "A\n\nB");
});

test("hasManualChunks returns true only when there is valid content", () => {
  assert.equal(hasManualChunks(["", " "]), false);
  assert.equal(hasManualChunks(["noi dung"]), true);
});
