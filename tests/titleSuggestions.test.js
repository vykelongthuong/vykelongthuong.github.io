import test from "node:test";
import assert from "node:assert/strict";
import { parseTitleSuggestions } from "../src/js/utils/titleSuggestions.js";

test("parseTitleSuggestions parses JSON array", () => {
  const input = "[\"Title 1\", \"Title 2\"]";
  assert.deepEqual(parseTitleSuggestions(input), ["Title 1", "Title 2"]);
});

test("parseTitleSuggestions falls back to line parsing", () => {
  const input = "1. Title A\n2) Title B\n- Title C";
  assert.deepEqual(parseTitleSuggestions(input), [
    "Title A",
    "Title B",
    "Title C",
  ]);
});
