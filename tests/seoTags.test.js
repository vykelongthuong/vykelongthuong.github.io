import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SEO_TAGS_MAX_CHARS,
  normalizeSeoTagsOutput,
} from "../src/js/utils/seoTags.js";

test("normalizeSeoTagsOutput normalizes spacing and removes duplicates", () => {
  const result = normalizeSeoTagsOutput("  tag 1,tag 2, tag 1 , tag 3  ");
  assert.equal(result, "tag 1, tag 2, tag 3");
});

test("normalizeSeoTagsOutput supports line breaks and empty values", () => {
  const result = normalizeSeoTagsOutput("\n, tag a\n, ,tag b\r\n");
  assert.equal(result, "tag a, tag b");
});

test("normalizeSeoTagsOutput enforces max total chars with comma separators", () => {
  const result = normalizeSeoTagsOutput("aaaa, bbbb, cccc", 10);
  assert.equal(result, "aaaa, bbbb");
});

test("DEFAULT_SEO_TAGS_MAX_CHARS is 500", () => {
  assert.equal(DEFAULT_SEO_TAGS_MAX_CHARS, 500);
});
