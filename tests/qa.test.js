import test from "node:test";
import assert from "node:assert/strict";
import { buildQaPrompt } from "../src/js/utils/qa.js";

const template = "Câu hỏi: {question}";

test("buildQaPrompt replaces question and trims", () => {
  const result = buildQaPrompt(template, "  Ai là nhân vật chính?  ");
  assert.equal(result, "Câu hỏi: Ai là nhân vật chính?");
});

test("buildQaPrompt keeps template when question empty", () => {
  const result = buildQaPrompt(template, "");
  assert.equal(result, "Câu hỏi: ");
});
