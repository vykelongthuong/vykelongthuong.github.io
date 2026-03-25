import test from "node:test";
import assert from "node:assert/strict";
import {
  ALLOWED_STORY_GENRES,
  buildAudioFavoriteTitle,
  parseAudioFavoriteTitle,
  resolveStoryTitleGenre,
  normalizeStoryGenre,
  normalizeStoryIcon,
} from "../src/js/utils/storyMetadata.js";

test("ALLOWED_STORY_GENRES keeps only configured genres", () => {
  assert.deepEqual(ALLOWED_STORY_GENRES, [
    "Trinh thám",
    "Tâm lý tội phạm",
    "Kinh dị",
    "Ngôn tình",
    "Ngôn tình ngược",
    "Cổ trang",
  ]);
});

test("normalizeStoryGenre maps unsupported genre to closest allowed genre", () => {
  assert.equal(normalizeStoryGenre("Tiên hiệp"), "Ngôn tình");
  assert.equal(normalizeStoryGenre("trinh tham"), "Trinh thám");
  assert.equal(normalizeStoryGenre("cổ đại"), "Cổ trang");
});

test("buildAudioFavoriteTitle returns exact required format with normalized genre", () => {
  const result = buildAudioFavoriteTitle("Tội phạm", "Vạn Cổ", "🗡️");
  assert.equal(result, "Audio Tâm lý tội phạm / Vạn Cổ 🗡️ | Trần Thiên Minh");
});

test("buildAudioFavoriteTitle falls back defaults when empty", () => {
  const result = buildAudioFavoriteTitle("", "", "");
  assert.equal(
    result,
    "Audio Ngôn tình / Truyện Hay Mỗi Ngày 📚 | Trần Thiên Minh",
  );
});

test("parseAudioFavoriteTitle extracts and normalizes genre", () => {
  const parsed = parseAudioFavoriteTitle(
    "Audio Đô thị / Hào Môn Thiếu Gia 💼 | Trần Thiên Minh",
  );
  assert.deepEqual(parsed, {
    genre: "Ngôn tình",
    title: "Hào Môn Thiếu Gia",
  });
});

test("resolveStoryTitleGenre prioritizes user input", () => {
  const result = resolveStoryTitleGenre({
    userTitle: "Tên Người Dùng",
    userGenre: "Ngôn tình ngược",
    aiTitle: "Tên AI",
    aiGenre: "Kinh dị",
    titleSuggestions: ["Audio Tiên hiệp / Tên Gợi Ý 🗡️ | Trần Thiên Minh"],
  });

  assert.deepEqual(result, {
    title: "Tên Người Dùng",
    genre: "Ngôn tình ngược",
  });
});

test("resolveStoryTitleGenre falls back to normalized suggestion/ai genre", () => {
  const result = resolveStoryTitleGenre({
    userTitle: "",
    userGenre: "",
    aiTitle: "",
    aiGenre: "Horror",
    titleSuggestions: ["Audio Đô thị / Đêm Định Mệnh 🔍 | Trần Thiên Minh"],
  });

  assert.deepEqual(result, {
    title: "Đêm Định Mệnh",
    genre: "Kinh dị",
  });
});

test("normalizeStoryIcon takes first token and fallback", () => {
  assert.equal(normalizeStoryIcon("🎧 📚"), "🎧");
  assert.equal(normalizeStoryIcon(""), "📚");
});
