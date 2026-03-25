import test from "node:test";
import assert from "node:assert/strict";
import {
  buildQualityCheckPrompt,
  buildRegenerationPrompt,
  pairChunksForRefine,
  buildChunkAnalysisSummary,
} from "../src/js/utils/translationRefine.js";

const qualityTemplate = "Goc: {original_text} - Dich: {translated_text}";
const regenTemplate =
  "Goc: {original_text} - Ban1: {first_translation} - Gop y: {editor_feedback}";

test("buildQualityCheckPrompt replaces placeholders", () => {
  const result = buildQualityCheckPrompt(qualityTemplate, "A", "B");
  assert.equal(result, "Goc: A - Dich: B");
});

test("buildRegenerationPrompt replaces placeholders", () => {
  const result = buildRegenerationPrompt(regenTemplate, "A", "B", "C");
  assert.equal(result, "Goc: A - Ban1: B - Gop y: C");
});

test("pairChunksForRefine pairs chunks by index", () => {
  const pairs = pairChunksForRefine(["goc1", "goc2"], ["dich1", "dich2"]);
  assert.deepEqual(pairs, [
    { index: 0, originalText: "goc1", translatedText: "dich1" },
    { index: 1, originalText: "goc2", translatedText: "dich2" },
  ]);
});

test("pairChunksForRefine throws when lengths mismatch", () => {
  assert.throws(
    () => pairChunksForRefine(["goc1"], ["dich1", "dich2"]),
    /không khớp/i,
  );
});

test("buildChunkAnalysisSummary creates readable markdown", () => {
  const result = buildChunkAnalysisSummary(["Lỗi 1", "Lỗi 2"]);
  assert.equal(
    result,
    "### Phân tích đoạn 1\nLỗi 1\n\n### Phân tích đoạn 2\nLỗi 2",
  );
});
