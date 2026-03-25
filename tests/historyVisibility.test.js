import test from "node:test";
import assert from "node:assert/strict";
import {
  filterRecordsByCompletedVisibility,
  getCompletedVisibilityButtonText,
} from "../src/js/utils/historyVisibility.js";

test("filterRecordsByCompletedVisibility returns original list when hide=false", () => {
  const records = [{ id: 1, isCompleted: true }, { id: 2, isCompleted: false }];
  const result = filterRecordsByCompletedVisibility(records, false);
  assert.deepEqual(result, records);
});

test("filterRecordsByCompletedVisibility filters completed when hide=true", () => {
  const records = [{ id: 1, isCompleted: true }, { id: 2, isCompleted: false }];
  const result = filterRecordsByCompletedVisibility(records, true);
  assert.deepEqual(result, [{ id: 2, isCompleted: false }]);
});

test("getCompletedVisibilityButtonText returns proper text", () => {
  assert.equal(getCompletedVisibilityButtonText(false), "Ẩn truyện đã làm");
  assert.equal(getCompletedVisibilityButtonText(true), "Hiện truyện đã làm");
});
