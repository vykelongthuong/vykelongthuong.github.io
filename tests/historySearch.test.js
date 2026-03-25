import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSearchText,
  isApproximateNameMatch,
  isExactUrlMatch,
} from "../src/js/utils/historySearch.js";

test("normalizeSearchText removes Vietnamese accents and normalizes spaces", () => {
  assert.equal(normalizeSearchText("  Đế   Vương Kỳ  "), "de vuong ky");
});

test("isApproximateNameMatch supports contains and near typo", () => {
  assert.equal(isApproximateNameMatch("Đế Vương Kỳ Án", "de vuong"), true);
  assert.equal(isApproximateNameMatch("Thiên Hạ", "thieen"), true);
  assert.equal(isApproximateNameMatch("Tiên Hiệp", "do thi"), false);
});

test("isExactUrlMatch requires exact normalized URL", () => {
  assert.equal(
    isExactUrlMatch(
      "https://example.com/story/1#part",
      "https://example.com/story/1",
    ),
    true,
  );
  assert.equal(
    isExactUrlMatch("https://example.com/story/1", "https://example.com/story/2"),
    false,
  );
});

test("isExactUrlMatch returns false when query URL invalid but not empty", () => {
  assert.equal(isExactUrlMatch("https://example.com/story/1", "abc"), false);
  assert.equal(isExactUrlMatch("https://example.com/story/1", ""), true);
});
