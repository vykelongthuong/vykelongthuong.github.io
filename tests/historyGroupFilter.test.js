import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStoryGroupSelectOptions,
  resolveStoryGroupSelection,
} from "../src/js/utils/historyGroupFilter.js";

test("buildStoryGroupSelectOptions prepends default 'Tất cả' option", () => {
  const options = buildStoryGroupSelectOptions(["trinh thám", "tiên hiệp"]);

  assert.deepEqual(options, [
    { value: "", label: "Tất cả" },
    { value: "trinh thám", label: "trinh thám" },
    { value: "tiên hiệp", label: "tiên hiệp" },
  ]);
});

test("resolveStoryGroupSelection keeps valid value with case-insensitive match", () => {
  const value = resolveStoryGroupSelection("TRINH THÁM", [
    "tiên hiệp",
    "trinh thám",
  ]);

  assert.equal(value, "trinh thám");
});

test("resolveStoryGroupSelection falls back to all when value does not exist", () => {
  const value = resolveStoryGroupSelection("huyền huyễn", [
    "tiên hiệp",
    "trinh thám",
  ]);

  assert.equal(value, "");
});
