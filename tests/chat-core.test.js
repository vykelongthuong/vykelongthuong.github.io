import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeApiBase,
  endpoint,
  buildChatRequest,
  normalizeTemperature,
  parseAssistantContent,
  renderLiteMarkdownToHtml,
  buildUserMessageContent,
  isSupportedTextAttachment,
  buildTextAttachmentBlock,
  groupModelsByOwner,
  createConnection,
  upsertConnection,
  removeConnectionById,
  getActiveConnection,
  updateConnectionModel,
  parseConnections,
  serializeChatHistory,
  parseChatHistoryFile,
  serializeChatSession,
  parseChatSessionFile,
  compactConversationMessages,
  maskToken,
} from "../src/chat-core.js";

test("normalizeApiBase trims and removes trailing slash", () => {
  const result = normalizeApiBase(" http://localhost:8317/ ");
  assert.equal(result, "http://localhost:8317");
});

test("endpoint builds /v1 path", () => {
  assert.equal(
    endpoint("http://localhost:8317", "models"),
    "http://localhost:8317/v1/models",
  );
  assert.equal(
    endpoint("http://localhost:8317/", "/chat/completions"),
    "http://localhost:8317/v1/chat/completions",
  );
});

test("buildChatRequest returns OpenAI-compatible payload", () => {
  const payload = buildChatRequest(
    "gpt-4o-mini",
    [{ role: "user", content: "Hi" }],
    { stream: true, temperature: 1.2 },
  );
  assert.equal(payload.model, "gpt-4o-mini");
  assert.equal(payload.stream, true);
  assert.equal(payload.temperature, 1.2);
  assert.equal(payload.messages.length, 1);
});

test("normalizeTemperature clamps and fallback", () => {
  assert.equal(normalizeTemperature(1.5), 1.5);
  assert.equal(normalizeTemperature(5), 2);
  assert.equal(normalizeTemperature(-1), 0);
  assert.equal(normalizeTemperature("abc", 0.9), 0.9);
});

test("parseAssistantContent reads response content", () => {
  const content = parseAssistantContent({
    choices: [{ message: { role: "assistant", content: "Hello" } }],
  });
  assert.equal(content, "Hello");
});

test("parseAssistantContent handles multimodal text array", () => {
  const content = parseAssistantContent({
    choices: [
      {
        message: {
          role: "assistant",
          content: [{ type: "text", text: "Xin chào" }],
        },
      },
    ],
  });
  assert.equal(content, "Xin chào");
});

test("buildUserMessageContent supports image payload format", () => {
  const content = buildUserMessageContent(
    "mô tả ảnh",
    "data:image/png;base64,abc",
  );
  assert.equal(Array.isArray(content), true);
  assert.equal(content[0].type, "text");
  assert.equal(content[1].type, "image_url");
  assert.equal(content[1].image_url.url, "data:image/png;base64,abc");
});

test("isSupportedTextAttachment validates file types", () => {
  assert.equal(isSupportedTextAttachment("notes.txt", "text/plain"), true);
  assert.equal(
    isSupportedTextAttachment("data.json", "application/json"),
    true,
  );
  assert.equal(
    isSupportedTextAttachment(
      "file.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
    true,
  );
  assert.equal(isSupportedTextAttachment("photo.png", "image/png"), false);
});

test("buildTextAttachmentBlock builds bounded content", () => {
  const longText = "a".repeat(700);
  const block = buildTextAttachmentBlock("a.txt", longText, {
    maxChars: 600,
  });
  assert.equal(block.includes("[TÀI LIỆU ĐÍNH KÈM: a.txt]"), true);
  assert.equal(block.includes("a".repeat(600)), true);
  assert.equal(block.includes("đã được cắt"), true);
});

test("groupModelsByOwner groups by owned_by and sorts values", () => {
  const groups = groupModelsByOwner([
    { id: "gpt-4o", owned_by: "openai" },
    { id: "gpt-5.1", owned_by: "openai" },
    { id: "my-model", owned_by: "local" },
    { id: "unknown-model" },
  ]);

  assert.equal(groups.length, 3);
  assert.deepEqual(
    groups.map((g) => g.owner),
    ["local", "openai", "unknown"],
  );
  assert.deepEqual(
    groups.find((g) => g.owner === "openai").items.map((m) => m.id),
    ["gpt-4o", "gpt-5.1"],
  );
});

test("createConnection normalizes base and stores token", () => {
  const conn = createConnection("http://localhost:8317/", " sk-abc ");
  assert.equal(conn.id, "http://localhost:8317");
  assert.equal(conn.base, "http://localhost:8317");
  assert.equal(conn.token, "sk-abc");
  assert.equal(conn.model, "");
});

test("upsertConnection updates token when base existed", () => {
  const initial = [
    {
      id: "http://localhost:8317",
      base: "http://localhost:8317",
      token: "old",
      model: "",
    },
  ];
  const result = upsertConnection(
    initial,
    "http://localhost:8317",
    "new-token",
  );
  assert.equal(result.connections.length, 1);
  assert.equal(result.connection.token, "new-token");
});

test("removeConnectionById removes target connection", () => {
  const list = [
    { id: "a", base: "http://a", token: "t1", model: "" },
    { id: "b", base: "http://b", token: "t2", model: "" },
  ];
  const next = removeConnectionById(list, "a");
  assert.equal(next.length, 1);
  assert.equal(next[0].id, "b");
});

test("getActiveConnection returns matched one or first", () => {
  const list = [
    { id: "a", base: "http://a", token: "t1", model: "" },
    { id: "b", base: "http://b", token: "t2", model: "" },
  ];
  assert.equal(getActiveConnection(list, "b").id, "b");
  assert.equal(getActiveConnection(list, "x").id, "a");
});

test("updateConnectionModel updates selected connection", () => {
  const list = [
    { id: "a", base: "http://a", token: "t1", model: "" },
    { id: "b", base: "http://b", token: "t2", model: "" },
  ];
  const next = updateConnectionModel(list, "b", "gpt-5.1");
  assert.equal(next.find((x) => x.id === "b").model, "gpt-5.1");
});

test("parseConnections parses and sanitizes cache", () => {
  const raw = JSON.stringify([
    { base: "http://localhost:8317/", token: " sk-1 ", model: "gpt-4o" },
    { base: "http://localhost:9000", token: "" },
  ]);
  const parsed = parseConnections(raw);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].base, "http://localhost:8317");
  assert.equal(parsed[0].token, "sk-1");
  assert.equal(parsed[0].model, "gpt-4o");
});

test("serializeChatHistory creates valid export payload", () => {
  const payload = serializeChatHistory([{ role: "user", content: "hello" }], {
    connectionId: "http://localhost:8317",
    model: "gpt-4o",
    stream: true,
  });

  assert.equal(payload.version, 1);
  assert.equal(payload.meta.model, "gpt-4o");
  assert.equal(payload.meta.stream, true);
  assert.equal(payload.messages.length, 1);
});

test("parseChatHistoryFile parses valid history file", () => {
  const raw = JSON.stringify({
    version: 1,
    meta: { model: "gpt-4o" },
    messages: [
      { role: "user", content: "Hi" },
      {
        role: "assistant",
        content: [{ type: "text", text: "Hello" }],
      },
    ],
  });

  const parsed = parseChatHistoryFile(raw);
  assert.equal(parsed.messages.length, 2);
  assert.equal(parsed.meta.model, "gpt-4o");
});

test("serializeChatSession outputs session payload", () => {
  const payload = serializeChatSession({
    id: "s1",
    title: "chat 1",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:01:00.000Z",
    connectionId: "http://localhost:8317",
    model: "gpt-4o",
    stream: false,
    temperature: 1.1,
    pinned: true,
    messages: [{ role: "user", content: "Hello" }],
  });

  assert.equal(payload.id, "s1");
  assert.equal(payload.title, "chat 1");
  assert.equal(payload.temperature, 1.1);
  assert.equal(payload.pinned, true);

  assert.equal(payload.messages.length, 1);
});

test("parseChatSessionFile parses chat session file", () => {
  const raw = JSON.stringify({
    version: 1,
    id: "s2",
    title: "older chat",
    temperature: 0.3,
    pinned: true,
    messages: [{ role: "user", content: "Hi" }],
  });

  const parsed = parseChatSessionFile(raw);
  assert.equal(parsed.id, "s2");
  assert.equal(parsed.title, "older chat");
  assert.equal(parsed.temperature, 0.3);
  assert.equal(parsed.pinned, true);

  assert.equal(parsed.messages.length, 1);
});

test("compactConversationMessages keeps recent messages and adds summary", () => {
  const messages = [
    { role: "user", content: "A" },
    { role: "assistant", content: "B" },
    { role: "user", content: "C" },
    { role: "assistant", content: "D" },
    { role: "user", content: "E" },
  ];

  const compacted = compactConversationMessages(messages, {
    maxRecentMessages: 2,
    maxCharsOlder: 200,
  });

  assert.equal(compacted.length, 3);
  assert.equal(compacted[0].role, "system");
  assert.equal(String(compacted[0].content).includes("user: A"), true);
  assert.equal(compacted[1].content, "D");
  assert.equal(compacted[2].content, "E");
});

test("compactConversationMessages keeps original when short", () => {
  const messages = [
    { role: "user", content: "Xin chào" },
    { role: "assistant", content: "Chào bạn" },
  ];

  const compacted = compactConversationMessages(messages, {
    maxRecentMessages: 4,
  });

  assert.deepEqual(compacted, messages);
});

test("renderLiteMarkdownToHtml renders bold and bullet list", () => {
  const html = renderLiteMarkdownToHtml(
    "Phong cách: **Tối giản**\n- **Mục 1**\n- Mục 2",
  );

  assert.equal(html.includes("<strong>Tối giản</strong>"), true);
  assert.equal(html.includes("<ul>"), true);
  assert.equal(html.includes("<li><strong>Mục 1</strong></li>"), true);
});

test("renderLiteMarkdownToHtml escapes html", () => {
  const html = renderLiteMarkdownToHtml("<script>alert(1)</script> **ok**");
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"), true);
  assert.equal(html.includes("<strong>ok</strong>"), true);
});

test("maskToken hides token", () => {
  assert.equal(maskToken("sk-1234567890"), "sk-1...7890");
});
