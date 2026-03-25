import test from "node:test";
import assert from "node:assert/strict";
import {
  filterModelIds,
  groupModelIdsByProvider,
} from "../src/js/utils/models.js";

test("filterModelIds keeps usable models and excludes codex while preserving owned_by", () => {
  const models = [
    { id: "gpt-4", owned_by: "openai", created: 10 },
    { id: "gpt-4-codex", owned_by: "openai", created: 11 },
    { id: "qwen2.5-vl-7b-instruct", owned_by: "qwen" },
    { id: "vision-model", owned_by: "qwen", created: 20 },
    { id: "gemini-1.5-flash", owned_by: "google", created: 30 },
  ];

  const result = filterModelIds(models);
  assert.deepEqual(result, [
    { id: "gpt-4", ownedBy: "openai", created: 10 },
    { id: "qwen2.5-vl-7b-instruct", ownedBy: "qwen", created: 0 },
    { id: "vision-model", ownedBy: "qwen", created: 20 },
    { id: "gemini-1.5-flash", ownedBy: "google", created: 30 },
  ]);
});

test("groupModelIdsByProvider groups by owned_by and sorts by created desc", () => {
  const grouped = groupModelIdsByProvider([
    { id: "gpt-4", ownedBy: "openai", created: 100 },
    { id: "gpt-5", ownedBy: "openai", created: 200 },
    { id: "gemini-1.5-flash", ownedBy: "google", created: 150 },
    { id: "vision-model", ownedBy: "qwen", created: 120 },
    { id: "claude-sonnet", ownedBy: "aws", created: 90 },
  ]);

  assert.deepEqual(grouped, {
    openai: [
      { id: "gpt-5", ownedBy: "openai", created: 200 },
      { id: "gpt-4", ownedBy: "openai", created: 100 },
    ],
    google: [{ id: "gemini-1.5-flash", ownedBy: "google", created: 150 }],
    qwen: [{ id: "vision-model", ownedBy: "qwen", created: 120 }],
    aws: [{ id: "claude-sonnet", ownedBy: "aws", created: 90 }],
  });
});
