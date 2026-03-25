export const STORAGE_KEYS = {
  connections: "chat.connections",
  activeConnectionId: "chat.activeConnectionId",
  streamEnabled: "chat.streamEnabled",
  temperature: "chat.temperature",
};

export function createConnection(base, token) {
  const normalizedBase = normalizeApiBase(base);
  const cleanToken = (token || "").trim();

  if (!cleanToken) {
    throw new Error("Bearer token không được để trống");
  }

  return {
    id: normalizedBase,
    base: normalizedBase,
    token: cleanToken,
    model: "",
  };
}

export function upsertConnection(connections, base, token) {
  const next = Array.isArray(connections) ? [...connections] : [];
  const draft = createConnection(base, token);
  const index = next.findIndex((item) => item.base === draft.base);

  if (index >= 0) {
    next[index] = {
      ...next[index],
      token: draft.token,
      base: draft.base,
      id: draft.id,
    };
    return { connections: next, connection: next[index] };
  }

  next.push(draft);
  return { connections: next, connection: draft };
}

export function removeConnectionById(connections, id) {
  if (!Array.isArray(connections) || !id) return [];
  return connections.filter((item) => item.id !== id);
}

export function getActiveConnection(connections, activeId) {
  if (!Array.isArray(connections) || connections.length === 0) return null;
  if (activeId) {
    const matched = connections.find((item) => item.id === activeId);
    if (matched) return matched;
  }
  return connections[0];
}

export function updateConnectionModel(connections, id, model) {
  if (!Array.isArray(connections) || !id) return connections || [];
  return connections.map((item) =>
    item.id === id ? { ...item, model: model || "" } : item,
  );
}

export function parseConnections(raw) {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item.base === "string")
      .map((item) => ({
        id: normalizeApiBase(item.base),
        base: normalizeApiBase(item.base),
        token: typeof item.token === "string" ? item.token.trim() : "",
        model: typeof item.model === "string" ? item.model : "",
      }))
      .filter((item) => item.token);
  } catch {
    return [];
  }
}

export function normalizeApiBase(rawBase) {
  if (!rawBase || typeof rawBase !== "string") {
    throw new Error("API base URL không hợp lệ");
  }

  const trimmed = rawBase.trim().replace(/\/+$/, "");
  const url = new URL(trimmed);

  return url.toString().replace(/\/$/, "");
}

export function endpoint(base, path) {
  const normalized = normalizeApiBase(base);
  const cleanPath = path.replace(/^\/+/, "");
  return `${normalized}/v1/${cleanPath}`;
}

export function normalizeTemperature(rawValue, fallback = 0.7) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(2, Math.max(0, parsed));
}

export function buildChatRequest(model, messages, options = {}) {
  if (!model) throw new Error("Model chưa được chọn");
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Danh sách messages rỗng");
  }

  return {
    model,
    messages,
    temperature: normalizeTemperature(options.temperature, 0.7),
    stream: Boolean(options.stream),
  };
}

export function extractTextContent(content) {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.type === "text" && typeof item.text === "string") {
          return item.text;
        }
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

export function buildUserMessageContent(text, imageUrl) {
  const cleanText = (text || "").trim();
  const cleanImageUrl = (imageUrl || "").trim();

  if (cleanImageUrl) {
    const content = [];
    if (cleanText) {
      content.push({ type: "text", text: cleanText });
    }
    content.push({ type: "image_url", image_url: { url: cleanImageUrl } });
    return content;
  }

  if (!cleanText) {
    throw new Error("Cần nhập nội dung hoặc chọn ảnh");
  }

  return cleanText;
}

export function parseAssistantContent(chatResponse) {
  const content = chatResponse?.choices?.[0]?.message?.content;
  const text = extractTextContent(content);
  if (!text) {
    throw new Error("Response không đúng chuẩn OpenAI chat.completions");
  }
  return text;
}

export function groupModelsByOwner(models) {
  if (!Array.isArray(models)) return [];

  const groups = new Map();

  for (const model of models) {
    if (!model || typeof model.id !== "string") continue;

    const owner =
      typeof model.owned_by === "string" && model.owned_by.trim()
        ? model.owned_by.trim()
        : "unknown";

    if (!groups.has(owner)) {
      groups.set(owner, []);
    }

    groups.get(owner).push(model);
  }

  return Array.from(groups.entries())
    .map(([owner, items]) => ({
      owner,
      items: [...items].sort((a, b) => a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => a.owner.localeCompare(b.owner));
}

export function serializeChatHistory(history, meta = {}) {
  const safeHistory = Array.isArray(history)
    ? history.filter((item) => item && typeof item.role === "string")
    : [];

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    meta: {
      connectionId: meta.connectionId || "",
      model: meta.model || "",
      stream: Boolean(meta.stream),
    },
    messages: safeHistory,
  };
}

export function parseChatHistoryFile(rawJson) {
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error("File lịch sử không phải JSON hợp lệ");
  }

  if (!parsed || !Array.isArray(parsed.messages)) {
    throw new Error("File lịch sử thiếu trường messages");
  }

  const messages = parsed.messages.filter(
    (msg) => msg && typeof msg.role === "string" && msg.content !== undefined,
  );

  if (messages.length === 0) {
    throw new Error("File lịch sử không có message hợp lệ");
  }

  return {
    meta: parsed.meta || {},
    messages,
  };
}

export function serializeChatSession(session) {
  if (!session || !session.id) {
    throw new Error("Session không hợp lệ");
  }

  return {
    version: 1,
    id: session.id,
    title: session.title || "New chat",
    createdAt: session.createdAt || new Date().toISOString(),
    updatedAt: session.updatedAt || new Date().toISOString(),
    connectionId: session.connectionId || "",
    model: session.model || "",
    stream: Boolean(session.stream),
    temperature: normalizeTemperature(session.temperature, 0.7),
    pinned: Boolean(session.pinned),
    messages: Array.isArray(session.messages) ? session.messages : [],
  };
}

export function parseChatSessionFile(rawJson) {
  const parsed = parseChatHistoryFile(rawJson);
  const json = JSON.parse(rawJson);

  return {
    id:
      typeof json.id === "string" && json.id
        ? json.id
        : `session-${Date.now()}`,
    title:
      typeof json.title === "string" && json.title
        ? json.title
        : "Imported chat",
    createdAt:
      typeof json.createdAt === "string"
        ? json.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof json.updatedAt === "string"
        ? json.updatedAt
        : new Date().toISOString(),
    connectionId:
      typeof json.connectionId === "string" ? json.connectionId : "",
    model: typeof json.model === "string" ? json.model : "",
    stream: Boolean(json.stream),
    temperature: normalizeTemperature(json.temperature, 0.7),
    pinned: Boolean(json.pinned),
    messages: parsed.messages,
  };
}

function toCompactLine(message) {
  const role = typeof message?.role === "string" ? message.role : "unknown";
  const text = extractTextContent(message?.content) || "(no text)";
  return `${role}: ${text}`;
}

export function compactConversationMessages(messages, options = {}) {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const maxRecentMessages = Math.max(
    1,
    Number(options.maxRecentMessages) || 12,
  );
  const maxCharsOlder = Math.max(200, Number(options.maxCharsOlder) || 1600);

  const valid = messages.filter(
    (item) =>
      item && typeof item.role === "string" && item.content !== undefined,
  );

  if (valid.length <= maxRecentMessages) {
    return valid;
  }

  const older = valid.slice(0, -maxRecentMessages);
  const recent = valid.slice(-maxRecentMessages);

  const olderSummary = older
    .map((item) => toCompactLine(item))
    .join("\n")
    .slice(0, maxCharsOlder)
    .trim();

  if (!olderSummary) {
    return recent;
  }

  return [
    {
      role: "system",
      content:
        "Tóm tắt ngữ cảnh trước đó (rút gọn để tiết kiệm dữ liệu gửi):\n" +
        olderSummary,
    },
    ...recent,
  ];
}

function escapeHtml(raw) {
  return String(raw)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatInlineMarkdown(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function renderLiteMarkdownToHtml(rawText) {
  const text = String(rawText || "");
  if (!text.trim()) return "";

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let paragraphLines = [];
  let listItems = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const content = paragraphLines
      .map((line) => formatInlineMarkdown(line))
      .join("<br>");
    blocks.push(`<p>${content}</p>`);
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    const items = listItems
      .map((item) => `<li>${formatInlineMarkdown(item)}</li>`)
      .join("");
    blocks.push(`<ul>${items}</ul>`);
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1]);
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks.join("");
}

export function maskToken(token) {
  if (!token) return "(chưa có token)";
  if (token.length <= 8) return "********";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}
