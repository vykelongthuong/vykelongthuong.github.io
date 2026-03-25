import test from "node:test";
import assert from "node:assert/strict";
import { buildChatPayload } from "../src/js/utils/apiPayload.js";

test("buildChatPayload builds request payload", () => {
  const payload = buildChatPayload({
    model: "gpt-test",
    prompt: "Hello",
    systemMessage: "System",
  });
  assert.equal(payload.model, "gpt-test");
  assert.equal(payload.messages.length, 2);
  assert.equal(payload.messages[0].role, "system");
  assert.equal(payload.messages[1].content, "Hello");
  assert.equal(payload.stream, false);
});
