import test from "node:test";
import assert from "node:assert/strict";
import { buildHistoryEntry } from "../src/js/utils/historyEntry.js";

test("buildHistoryEntry stores id, source, conversation and story metadata", () => {
  const entry = buildHistoryEntry({
    id: "https://example.com/story/1",
    sourceUrl: "https://example.com/story/1",
    fileName: "story.docx",
    content: "translated",
    original: "original",
    date: "01/01/2026 10:00:00",
    titleSuggestions: ["Title A", "Title B"],
    storyDescription: "desc",
    favoriteTitle: "Title A",
    conversation: [{ role: "user", content: "q" }],
    storyIcon: "🗡️",
    customStoryTitle: "Thiên Hạ",
    customStoryGenre: "Tiên hiệp",
    customStoryDescription: "Hành trình tu luyện đầy biến cố.",
    storageLabel: "Quan trọng",
    cleanedContent: "cleaned",
    seoTags: "tag1,tag2",
    storyQuiz: "quiz",
    isCompleted: true,
    isDraft: false,
  });

  assert.deepEqual(entry, {
    id: "https://example.com/story/1",
    sourceUrl: "https://example.com/story/1",
    name: "Title A",
    fileName: "story.docx",
    content: "translated",
    original: "original",
    date: "01/01/2026 10:00:00",
    titleSuggestions: ["Title A", "Title B"],
    storyDescription: "desc",
    favoriteTitle: "Title A",
    conversation: [{ role: "user", content: "q" }],
    storyIcon: "🗡️",
    customStoryTitle: "Thiên Hạ",
    customStoryGenre: "Tiên hiệp",
    customStoryDescription: "Hành trình tu luyện đầy biến cố.",
    storageLabel: "Quan trọng",
    cleanedContent: "cleaned",
    seoTags: "tag1,tag2",
    storyQuiz: "quiz",
    isCompleted: true,
    isDraft: false,
  });
});

test("buildHistoryEntry falls back to safe defaults", () => {
  const entry = buildHistoryEntry({
    fileName: "story.docx",
    content: "translated",
    original: "original",
    titleSuggestions: "invalid",
    storyDescription: null,
    favoriteTitle: null,
  });

  assert.equal(entry.id, "");
  assert.equal(entry.sourceUrl, "");
  assert.equal(entry.name, "story.docx");
  assert.equal(entry.fileName, "story.docx");
  assert.deepEqual(entry.titleSuggestions, []);
  assert.equal(entry.storyDescription, "");
  assert.equal(entry.favoriteTitle, "");
  assert.deepEqual(entry.conversation, []);
  assert.equal(entry.storyIcon, "");
  assert.equal(entry.customStoryTitle, "");
  assert.equal(entry.customStoryGenre, "");
  assert.equal(entry.customStoryDescription, "");
  assert.equal(entry.storageLabel, "");
  assert.equal(entry.cleanedContent, "");
  assert.equal(entry.seoTags, "");
  assert.equal(entry.storyQuiz, "");
  assert.equal(entry.isCompleted, false);
  assert.equal(entry.isDraft, false);
});
