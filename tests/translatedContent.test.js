import test from "node:test";
import assert from "node:assert/strict";
import { resolveTranslatedContent } from "../src/js/utils/translatedContent.js";

test("resolveTranslatedContent ưu tiên state.translatedContent khi có dữ liệu", () => {
  const result = resolveTranslatedContent("  Nội dung từ state  ", "Nội dung UI");
  assert.equal(result, "Nội dung từ state");
});

test("resolveTranslatedContent fallback sang nội dung UI khi state rỗng", () => {
  const result = resolveTranslatedContent("   ", "  Nội dung từ giao diện  ");
  assert.equal(result, "Nội dung từ giao diện");
});

test("resolveTranslatedContent trả về chuỗi rỗng khi không có dữ liệu", () => {
  const result = resolveTranslatedContent(null, undefined);
  assert.equal(result, "");
});
