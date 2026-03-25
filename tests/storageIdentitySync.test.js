import test from "node:test";
import assert from "node:assert/strict";
import { resolveStorageIdentityForManualSave } from "../src/js/utils/storageIdentitySync.js";

test("resolveStorageIdentityForManualSave updates sourceUrl and keeps existing id when currentId exists", () => {
  const result = resolveStorageIdentityForManualSave("https://example.com/new", {
    currentId: "node-1",
    fallbackName: "story.docx",
  });

  assert.equal(result.id, "node-1");
  assert.equal(result.sourceUrl, "https://example.com/new");
});

test("resolveStorageIdentityForManualSave clears sourceUrl when non-url input", () => {
  const result = resolveStorageIdentityForManualSave("custom id", {
    currentId: "node-1",
    fallbackName: "story.docx",
  });

  assert.equal(result.id, "node-1");
  assert.equal(result.sourceUrl, "");
});

test("resolveStorageIdentityForManualSave generates identity when no current id", () => {
  const result = resolveStorageIdentityForManualSave("https://example.com/new", {
    currentId: "",
    fallbackName: "story.docx",
  });

  assert.equal(result.id, "https://example.com/new");
  assert.equal(result.sourceUrl, "https://example.com/new");
});
