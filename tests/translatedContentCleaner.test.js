import test from "node:test";
import assert from "node:assert/strict";
import { cleanTranslatedContent } from "../src/js/utils/translatedContentCleaner.js";

test("cleanTranslatedContent replaces configured special chars and dashes with comma", () => {
  const input = 'A"B~C?D*E!F#G:H-I–J—K';
  const result = cleanTranslatedContent(input);
  assert.equal(result, "A,B,C,D,E,F,G,H,I,J,K");
});

test("cleanTranslatedContent collapses repeated commas and dots", () => {
  const input = "Xin chao,,,, ban.... ....";
  const result = cleanTranslatedContent(input);
  assert.equal(result, "Xin chao, ban. .");
});

test("cleanTranslatedContent returns empty string for invalid input", () => {
  assert.equal(cleanTranslatedContent(""), "");
  assert.equal(cleanTranslatedContent(null), "");
  assert.equal(cleanTranslatedContent(undefined), "");
});
