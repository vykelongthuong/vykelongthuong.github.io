import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSourceUrl,
  findDuplicateSourceUrl,
} from "../src/js/utils/sourceUrl.js";

test("normalizeSourceUrl returns normalized URL without hash", () => {
  const result = normalizeSourceUrl("https://example.com/story/1/#top");
  assert.equal(result, "https://example.com/story/1");
});

test("normalizeSourceUrl returns empty string for non-http input", () => {
  assert.equal(normalizeSourceUrl("story-123"), "");
});

test("findDuplicateSourceUrl finds matching URL from records", () => {
  const records = [
    { id: "1", sourceUrl: "https://example.com/story/1#part-a", name: "A" },
    { id: "2", sourceUrl: "https://example.com/story/2", name: "B" },
  ];

  const duplicate = findDuplicateSourceUrl(
    records,
    "https://example.com/story/1/",
  );

  assert.equal(duplicate?.id, "1");
});

test("findDuplicateSourceUrl ignores current record by id", () => {
  const records = [{ id: "1", sourceUrl: "https://example.com/story/1" }];

  const duplicate = findDuplicateSourceUrl(
    records,
    "https://example.com/story/1",
    "1",
  );

  assert.equal(duplicate, null);
});
