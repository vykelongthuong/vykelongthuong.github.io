import test from "node:test";
import assert from "node:assert/strict";
import { splitText } from "../src/js/utils/text.js";

test("splitText returns single part when numParts <= 1", () => {
  const result = splitText("line1\nline2", 1);
  assert.deepEqual(result, ["line1\nline2"]);
});

test("splitText splits text into requested number of parts", () => {
  const input = "a\nb\nc\nd";
  const result = splitText(input, 2);
  assert.equal(result.length, 2);
  assert.ok(result[0].includes("a"));
  assert.ok(result[1].includes("c"));
});
