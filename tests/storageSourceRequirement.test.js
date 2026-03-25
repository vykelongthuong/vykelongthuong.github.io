import test from "node:test";
import assert from "node:assert/strict";
import { isRequiredSourceUrlProvided } from "../src/js/utils/storageSourceRequirement.js";

test("isRequiredSourceUrlProvided returns true for valid http/https url", () => {
  assert.equal(isRequiredSourceUrlProvided("https://example.com/story/1"), true);
  assert.equal(isRequiredSourceUrlProvided("http://example.com"), true);
});

test("isRequiredSourceUrlProvided returns false for empty or non-url input", () => {
  assert.equal(isRequiredSourceUrlProvided(""), false);
  assert.equal(isRequiredSourceUrlProvided("custom-id"), false);
  assert.equal(isRequiredSourceUrlProvided("ftp://example.com"), false);
});
