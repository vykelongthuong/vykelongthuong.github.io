import test from "node:test";
import assert from "node:assert/strict";
import {
  extractAudioGenreGroupKey,
  getAvailableStoryGroups,
  isStoryGroupMatch,
  sortRecordsByStoryGroup,
} from "../src/js/utils/historySort.js";

test("extractAudioGenreGroupKey extracts genre between Audio and /", () => {
  const key = extractAudioGenreGroupKey({
    name: "Audio trinh thám / Người Cuối Cùng Đến Ban Quản Lý 🕵️‍♀️ | Trần Thiên Minh",
  });

  assert.equal(key, "trinh thám");
});

test("extractAudioGenreGroupKey falls back to customStoryGenre when title pattern missing", () => {
  const key = extractAudioGenreGroupKey({
    name: "Tên không chuẩn audio",
    customStoryGenre: "Đô thị",
  });

  assert.equal(key, "đô thị");
});

test("sortRecordsByStoryGroup groups by extracted story genre key", () => {
  const records = [
    {
      name: "Audio huyền huyễn / Truyện B | tác giả",
    },
    {
      name: "Audio trinh thám / Truyện A | tác giả",
    },
    {
      name: "Audio huyền huyễn / Truyện A | tác giả",
    },
  ];

  const result = sortRecordsByStoryGroup(records);

  assert.deepEqual(
    result.map((item) => item.name),
    [
      "Audio huyền huyễn / Truyện A | tác giả",
      "Audio huyền huyễn / Truyện B | tác giả",
      "Audio trinh thám / Truyện A | tác giả",
    ],
  );
});

test("sortRecordsByStoryGroup pushes records without group key to the end", () => {
  const records = [
    { name: "Không định dạng" },
    { name: "Audio tiên hiệp / Truyện A | tác giả" },
  ];

  const result = sortRecordsByStoryGroup(records);

  assert.deepEqual(
    result.map((item) => item.name),
    ["Audio tiên hiệp / Truyện A | tác giả", "Không định dạng"],
  );
});

test("getAvailableStoryGroups returns unique sorted list", () => {
  const groups = getAvailableStoryGroups([
    { name: "Audio trinh thám / A" },
    { name: "Audio tiên hiệp / B" },
    { name: "Audio trinh thám / C" },
  ]);

  assert.deepEqual(groups, ["tiên hiệp", "trinh thám"]);
});

test("isStoryGroupMatch matches exact normalized group", () => {
  const item = { name: "Audio trinh thám / A" };

  assert.equal(isStoryGroupMatch(item, "trinh thám"), true);
  assert.equal(isStoryGroupMatch(item, "TRINH THÁM"), true);
  assert.equal(isStoryGroupMatch(item, "tiên hiệp"), false);
  assert.equal(isStoryGroupMatch(item, ""), true);
});
