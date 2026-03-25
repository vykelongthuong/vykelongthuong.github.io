import test from "node:test";
import assert from "node:assert/strict";
import { resolveCleanedContent } from "../src/js/utils/cleanedContent.js";

test("resolveCleanedContent ưu tiên state.cleanedContent khi có dữ liệu", () => {
  const result = resolveCleanedContent("  Bản làm sạch từ state  ", "Bản làm sạch UI");
  assert.equal(result, "Bản làm sạch từ state");
});

test("resolveCleanedContent fallback sang nội dung UI khi state rỗng", () => {
  const result = resolveCleanedContent("   ", "  Bản làm sạch từ giao diện  ");
  assert.equal(result, "Bản làm sạch từ giao diện");
});

test("resolveCleanedContent trả về chuỗi rỗng khi không có dữ liệu", () => {
  const result = resolveCleanedContent(null, undefined);
  assert.equal(result, "");
});
