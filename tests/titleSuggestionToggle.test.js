import test from "node:test";
import assert from "node:assert/strict";
import { shouldAutoSuggestTitles } from "../src/js/utils/titleSuggestionToggle.js";

test("shouldAutoSuggestTitles returns true when toggle missing", () => {
  assert.equal(shouldAutoSuggestTitles(null), true);
});

test("shouldAutoSuggestTitles returns true when checked", () => {
  assert.equal(shouldAutoSuggestTitles({ checked: true }), true);
});

test("shouldAutoSuggestTitles returns false when unchecked", () => {
  assert.equal(shouldAutoSuggestTitles({ checked: false }), false);
});
