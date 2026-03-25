import test from "node:test";
import assert from "node:assert/strict";
import { buildStorageIdentity } from "../src/js/utils/storageId.js";

test("buildStorageIdentity keeps URL as id and sourceUrl", () => {
  const result = buildStorageIdentity("https://example.com/story/99", "story.docx");
  assert.equal(result.id, "https://example.com/story/99");
  assert.equal(result.sourceUrl, "https://example.com/story/99");
});

test("buildStorageIdentity uses custom id when not URL", () => {
  const result = buildStorageIdentity("my custom id", "story.docx");
  assert.equal(result.id, "my-custom-id");
  assert.equal(result.sourceUrl, "");
});

test("buildStorageIdentity generates fallback id", () => {
  const result = buildStorageIdentity("", "story.docx");
  assert.match(result.id, /^story\.docx-\d+$/);
  assert.equal(result.sourceUrl, "");
});
