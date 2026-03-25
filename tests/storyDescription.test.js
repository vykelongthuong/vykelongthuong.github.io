import test from "node:test";
import assert from "node:assert/strict";
import { buildStoryDescriptionPrompt } from "../src/js/utils/storyDescription.js";

test("buildStoryDescriptionPrompt injects favorite title and story text", () => {
  const template = "Tieu de: {favorite_title} | Noi dung: {story_text}";
  const result = buildStoryDescriptionPrompt(template, "ABC", "Ten Truyen");
  assert.equal(result, "Tieu de: Ten Truyen | Noi dung: ABC");
});
