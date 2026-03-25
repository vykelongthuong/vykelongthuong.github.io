import test from "node:test";
import assert from "node:assert/strict";
import {
  splitStoryIntoChunks,
  buildStoryContextAnalysisPrompt,
  buildChunkTranslationPrompt,
} from "../src/js/utils/storyChunking.js";

test("splitStoryIntoChunks returns single chunk when below threshold", () => {
  const text = "Ngan.".repeat(1000);
  const chunks = splitStoryIntoChunks(text);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0], text);
});

test("splitStoryIntoChunks cuts near boundary and keeps full content", () => {
  const part1 = "a".repeat(9800) + ".\n";
  const part2 = "b".repeat(9800) + "。\n";
  const part3 = "c".repeat(1200);
  const text = `${part1}${part2}${part3}`;

  const chunks = splitStoryIntoChunks(text, {
    splitThreshold: 100,
    targetSize: 10000,
    minSize: 9000,
    maxSize: 11000,
  });

  assert.ok(chunks.length >= 2);
  assert.equal(chunks.join(""), text);
  assert.ok(/[\n.!?。！？…]$/.test(chunks[0]));
});

test("splitStoryIntoChunks falls back to target index when no boundary", () => {
  const text = "x".repeat(25000);
  const chunks = splitStoryIntoChunks(text, {
    splitThreshold: 100,
    targetSize: 10000,
    minSize: 9000,
    maxSize: 11000,
  });

  assert.equal(chunks.join(""), text);
  assert.equal(chunks[0].length, 10000);
});

test("buildStoryContextAnalysisPrompt injects story text", () => {
  const result = buildStoryContextAnalysisPrompt("Noi dung: {story_text}", "ABC");
  assert.equal(result, "Noi dung: ABC");
});

test("buildChunkTranslationPrompt injects context and chunk metadata", () => {
  const result = buildChunkTranslationPrompt(
    "{context_summary}|{chunk_index}/{total_chunks}|{chunk_text}",
    {
      contextSummary: "CTX",
      chunkText: "Chunk",
      chunkIndex: 2,
      totalChunks: 4,
    },
  );

  assert.equal(result, "CTX|2/4|Chunk");
});
