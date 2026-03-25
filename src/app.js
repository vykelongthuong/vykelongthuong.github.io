import {
  STORAGE_KEYS,
  endpoint,
  buildChatRequest,
  parseAssistantContent,
  buildUserMessageContent,
  groupModelsByOwner,
  maskToken,
  parseConnections,
  upsertConnection,
  removeConnectionById,
  getActiveConnection,
  updateConnectionModel,
  serializeChatSession,
  parseChatSessionFile,
  compactConversationMessages,
  normalizeTemperature,
} from "./chat-core.js";

const HISTORY_DIR_NAME_KEY = "chat.historyDirName";
const HISTORY_DIR_SELECTED_KEY = "chat.historyDirSelected";
const DIRECTORY_DB_NAME = "chat.directory.cache";
const DIRECTORY_STORE_NAME = "handles";
const DIRECTORY_HANDLE_KEY = "historyDir";

const apiBaseInput = document.getElementById("apiBase");
const tokenInput = document.getElementById("apiToken");
const connectionSelect = document.getElementById("connectionSelect");
const quickConnectionSelect = document.getElementById("quickConnectionSelect");
const mainConnectionSelect = document.getElementById("mainConnectionSelect");
const mainModelSelect = document.getElementById("mainModelSelect");
const temperatureRange = document.getElementById("temperatureRange");
const temperatureValue = document.getElementById("temperatureValue");

const removeConnectionBtn = document.getElementById("removeConnectionBtn");
const appShell = document.querySelector(".app-shell");
const openSettingsBtn = document.getElementById("openSettingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const settingsDrawer = document.getElementById("settingsDrawer");
const settingsBackdrop = document.getElementById("settingsBackdrop");
const activeConnectionLabel = document.getElementById("activeConnectionLabel");
const streamToggle = document.getElementById("streamToggle");
const modelSelect = document.getElementById("modelSelect");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const refreshModelsBtn = document.getElementById("refreshModelsBtn");
const sidebarEl = document.getElementById("sidebar");
const workspaceEl = document.querySelector(".workspace");
const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
const newChatBtn = document.getElementById("newChatBtn");
const pickFolderBtn = document.getElementById("pickFolderBtn");
const sessionListEl = document.getElementById("sessionList");
const sessionActionMenu = document.getElementById("sessionActionMenu");
const renameSessionBtn = document.getElementById("renameSessionBtn");
const pinSessionBtn = document.getElementById("pinSessionBtn");
const deleteSessionBtn = document.getElementById("deleteSessionBtn");
const folderStatusEl = document.getElementById("folderStatus");
const chatTitleEl = document.getElementById("chatTitle");
const emptyHero = document.getElementById("emptyHero");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const imageInput = document.getElementById("imageInput");
const clearImageBtn = document.getElementById("clearImageBtn");
const imagePreviewWrap = document.getElementById("imagePreviewWrap");
const imagePreview = document.getElementById("imagePreview");
const composerPlusBtn = document.getElementById("composerPlusBtn");
const composerMenu1 = document.getElementById("composerMenu1");
const addImageFileAction = document.getElementById("addImageFileAction");
const openProjectAction = document.getElementById("openProjectAction");
const openSettingsAction = document.getElementById("openSettingsAction");
const messagesEl = document.getElementById("messages");
const messagesInnerEl = document.getElementById("messagesInner");

const statusEl = document.getElementById("status");
const sendBtn = document.getElementById("sendBtn");
const messageTemplate = document.getElementById("messageTemplate");

let connections = [];
let activeConnectionId = "";
let sessions = [];
let activeSessionId = "";
let historyDirHandle = null;
let activeSessionMenuId = "";

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toggleSettingsDrawer(open) {
  settingsDrawer.classList.toggle("hidden", !open);
  settingsDrawer.setAttribute("aria-hidden", String(!open));
}

function getCurrentConnection() {
  return getActiveConnection(connections, activeConnectionId);
}

function getActiveSession() {
  return sessions.find((s) => s.id === activeSessionId) || null;
}

function extractText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((x) => x?.type === "text")
    .map((x) => x.text || "")
    .join("\n");
}

function extractImage(content) {
  if (!Array.isArray(content)) return "";
  return content.find((x) => x?.type === "image_url")?.image_url?.url || "";
}

function createMessageNode(role, content, imageUrl = "") {
  const node = messageTemplate.content.firstElementChild.cloneNode(true);
  node.classList.add(role);
  node.querySelector(".role").textContent = role;
  node.querySelector(".content").textContent = content || "";
  const img = node.querySelector(".message-image");
  if (imageUrl) {
    img.src = imageUrl;
    img.classList.remove("hidden");
  } else {
    img.classList.add("hidden");
    img.removeAttribute("src");
  }

  return node;
}

function appendMessage(role, content, imageUrl = "") {
  const node = createMessageNode(role, content, imageUrl);
  messagesInnerEl.appendChild(node);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return node;
}

function updateHeroVisibility() {
  const session = getActiveSession();
  const hasMessages = Boolean(session?.messages?.length);
  emptyHero.classList.toggle("hidden", hasMessages);
}

function renderMessages() {
  messagesInnerEl.innerHTML = "";
  const session = getActiveSession();

  if (!session) {
    updateHeroVisibility();
    return;
  }

  for (const msg of session.messages) {
    appendMessage(
      msg.role,
      extractText(msg.content),
      extractImage(msg.content),
    );
  }
  updateHeroVisibility();
}

function addTypingIndicator() {
  const el = document.createElement("div");
  el.className = "typing-indicator";
  el.id = "typingIndicator";
  el.textContent = "Assistant đang phản hồi...";
  messagesInnerEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTypingIndicator() {
  document.getElementById("typingIndicator")?.remove();
}

function persistConnections() {
  localStorage.setItem(STORAGE_KEYS.connections, JSON.stringify(connections));
  localStorage.setItem(
    STORAGE_KEYS.activeConnectionId,
    activeConnectionId || "",
  );
}

function persistStreamSetting() {
  localStorage.setItem(
    STORAGE_KEYS.streamEnabled,
    String(streamToggle.checked),
  );
}

function hideSessionActionMenu() {
  activeSessionMenuId = "";
  sessionActionMenu.classList.add("hidden");
  sessionActionMenu.setAttribute("aria-hidden", "true");
}

function sortSessionsInPlace() {
  sessions.sort((a, b) => {
    const pinDelta = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pinDelta !== 0) return pinDelta;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
}

function openSessionActionMenu(sessionId, anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  activeSessionMenuId = sessionId;
  sessionActionMenu.style.top = `${rect.bottom + 6}px`;
  sessionActionMenu.style.left = `${rect.right - 220}px`;
  sessionActionMenu.classList.remove("hidden");
  sessionActionMenu.setAttribute("aria-hidden", "false");
}

function renderSessionList() {
  sessionListEl.innerHTML = "";
  for (const session of sessions) {
    const row = document.createElement("div");
    row.className = "session-row";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `session-item ${session.id === activeSessionId ? "active" : ""}`;
    btn.title = session.title || "New chat";

    const title = document.createElement("span");
    title.className = "session-title";
    title.textContent = `${session.pinned ? "📌 " : ""}${session.title || "New chat"}`;
    btn.appendChild(title);

    const moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "session-more";
    moreBtn.textContent = "⋯";
    moreBtn.title = "Tùy chọn đoạn chat";

    btn.addEventListener("click", () => switchSession(session.id));
    moreBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (activeSessionMenuId === session.id) {
        hideSessionActionMenu();
      } else {
        const target = sessions.find((s) => s.id === session.id);
        pinSessionBtn.textContent = target?.pinned
          ? "📌 Bỏ ghim đoạn chat"
          : "📌 Ghim đoạn chat";
        openSessionActionMenu(session.id, moreBtn);
      }
    });

    row.appendChild(btn);
    row.appendChild(moreBtn);
    sessionListEl.appendChild(row);
  }
}

function updateSessionTitleFromMessage(session, text) {
  if (!session || session.title !== "New chat") return;
  const title = (text || "").trim().slice(0, 40) || "Image chat";
  session.title = title;
}

function getTemperatureValue() {
  return Number(temperatureRange?.value || 0.7);
}

function renderTemperatureValue() {
  const value = getTemperatureValue();
  temperatureValue.textContent = value.toFixed(1);
}

function createNewSession() {
  const newSession = {
    id: uid(),
    title: "New chat",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    connectionId: activeConnectionId,
    model: modelSelect.value || "",
    stream: streamToggle.checked,
    temperature: getTemperatureValue(),
    pinned: false,
    messages: [],
  };

  sessions.unshift(newSession);
  activeSessionId = newSession.id;
  sortSessionsInPlace();
  renderSessionList();
  renderMessages();
  chatTitleEl.textContent = "Hôm nay bạn muốn làm gì?";
}

async function saveSessionToDirectory(session) {
  if (!historyDirHandle || !session) return;
  try {
    const fileHandle = await historyDirHandle.getFileHandle(
      `${session.id}.json`,
      { create: true },
    );
    const writable = await fileHandle.createWritable();
    await writable.write(
      JSON.stringify(serializeChatSession(session), null, 2),
    );
    await writable.close();
  } catch (err) {
    setStatus(`Không thể lưu file session: ${err.message}`, "error");
  }
}

function updateFolderStatus() {
  const selected = Boolean(historyDirHandle);
  const rememberedName = localStorage.getItem(HISTORY_DIR_NAME_KEY) || "";

  if (selected) {
    folderStatusEl.textContent = `Đã chọn thư mục: ${historyDirHandle.name || rememberedName || "(không rõ tên)"}`;
  } else if (rememberedName) {
    folderStatusEl.textContent = `Đã lưu thư mục trước đó: ${rememberedName} (chưa cấp quyền)`;
  } else {
    folderStatusEl.textContent = "Chưa chọn thư mục lưu trữ";
  }

  folderStatusEl.classList.toggle("ok", selected);
}

async function openDirectoryDb() {
  return await new Promise((resolve, reject) => {
    const req = indexedDB.open(DIRECTORY_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DIRECTORY_STORE_NAME)) {
        db.createObjectStore(DIRECTORY_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error || new Error("Không mở được IndexedDB"));
  });
}

async function saveDirectoryHandleToDb(handle) {
  const db = await openDirectoryDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DIRECTORY_STORE_NAME, "readwrite");
    tx.objectStore(DIRECTORY_STORE_NAME).put(handle, DIRECTORY_HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Không lưu được thư mục"));
  });
  db.close();
}

async function loadDirectoryHandleFromDb() {
  const db = await openDirectoryDb();
  const handle = await new Promise((resolve, reject) => {
    const tx = db.transaction(DIRECTORY_STORE_NAME, "readonly");
    const req = tx.objectStore(DIRECTORY_STORE_NAME).get(DIRECTORY_HANDLE_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () =>
      reject(req.error || new Error("Không đọc được thư mục đã lưu"));
  });
  db.close();
  return handle;
}

async function restoreHistoryFolderFromCache() {
  if (localStorage.getItem(HISTORY_DIR_SELECTED_KEY) !== "true") {
    updateFolderStatus();
    return;
  }

  try {
    const handle = await loadDirectoryHandleFromDb();
    if (!handle) {
      updateFolderStatus();
      return;
    }

    const permission = await handle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      updateFolderStatus();
      return;
    }

    historyDirHandle = handle;
    updateFolderStatus();
    await loadSessionsFromDirectory();
    setStatus("Đã khôi phục thư mục lưu lịch sử", "success");
  } catch {
    updateFolderStatus();
  }
}

async function pickHistoryFolder() {
  if (!window.showDirectoryPicker) {
    setStatus("Trình duyệt chưa hỗ trợ chọn thư mục", "error");
    return;
  }

  try {
    historyDirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    localStorage.setItem(HISTORY_DIR_NAME_KEY, historyDirHandle.name || "");
    localStorage.setItem(HISTORY_DIR_SELECTED_KEY, "true");
    await saveDirectoryHandleToDb(historyDirHandle);
    updateFolderStatus();
    setStatus("Đã chọn thư mục lưu lịch sử", "success");
    for (const session of sessions) {
      if (session.messages.length > 0) {
        await saveSessionToDirectory(session);
      }
    }
  } catch {
    setStatus("Đã hủy chọn thư mục", "error");
  }
}

async function loadSessionsFromDirectory() {
  if (!historyDirHandle) return;
  const loaded = [];
  for await (const entry of historyDirHandle.values()) {
    if (entry.kind !== "file" || !entry.name.endsWith(".json")) continue;
    const file = await entry.getFile();
    const raw = await file.text();
    try {
      loaded.push(parseChatSessionFile(raw));
    } catch {
      continue;
    }
  }
  if (loaded.length > 0) {
    sessions = loaded.map((s) => ({
      ...s,
      pinned: Boolean(s.pinned),
      temperature: normalizeTemperature(s.temperature, 0.7),
    }));

    sortSessionsInPlace();
    activeSessionId = sessions[0].id;
    renderSessionList();
    renderMessages();
    chatTitleEl.textContent = "Hôm nay bạn muốn làm gì?";
    setStatus(`Đã nạp ${loaded.length} hội thoại từ thư mục`, "success");
  }
}

function switchSession(sessionId) {
  activeSessionId = sessionId;
  hideSessionActionMenu();
  const session = getActiveSession();
  if (!session) return;

  if (session.connectionId) {
    activeConnectionId = session.connectionId;
    renderConnections();
  }
  if (session.model) {
    modelSelect.value = session.model;
    mainModelSelect.value = session.model;
  }
  streamToggle.checked = Boolean(session.stream);
  temperatureRange.value = String(normalizeTemperature(session.temperature));
  renderTemperatureValue();

  chatTitleEl.textContent = "Hôm nay bạn muốn làm gì?";
  renderSessionList();
  renderMessages();
}

function formatConnectionLabel(conn) {
  return `${conn.base} (${maskToken(conn.token)})`;
}

function renderConnections() {
  const current = getCurrentConnection();
  connectionSelect.innerHTML = "";
  quickConnectionSelect.innerHTML = "";
  mainConnectionSelect.innerHTML = "";

  for (const conn of connections) {
    const option = document.createElement("option");
    option.value = conn.id;
    option.textContent = formatConnectionLabel(conn);
    connectionSelect.appendChild(option);

    const quick = document.createElement("option");
    quick.value = conn.id;
    quick.textContent = conn.base;
    quickConnectionSelect.appendChild(quick);

    const main = document.createElement("option");
    main.value = conn.id;
    main.textContent = conn.base;
    mainConnectionSelect.appendChild(main);
  }

  if (current) {
    connectionSelect.value = current.id;
    quickConnectionSelect.value = current.id;
    mainConnectionSelect.value = current.id;

    activeConnectionLabel.textContent = `${current.base} • ${maskToken(current.token)}`;
    apiBaseInput.value = current.base;
    tokenInput.value = current.token;
  } else {
    activeConnectionLabel.textContent = "Chưa chọn API";
  }
  removeConnectionBtn.disabled = !current;
}

function saveConnection() {
  try {
    const { connections: nextConnections, connection } = upsertConnection(
      connections,
      apiBaseInput.value,
      tokenInput.value,
    );
    connections = nextConnections;
    activeConnectionId = connection.id;
    persistConnections();
    renderConnections();
    setStatus(`Đã lưu kết nối ${connection.base}`, "success");
  } catch (err) {
    setStatus(err.message || "Không thể lưu kết nối", "error");
  }
}

function removeCurrentConnection() {
  if (!activeConnectionId) return;
  connections = removeConnectionById(connections, activeConnectionId);
  activeConnectionId = connections[0]?.id || "";
  persistConnections();
  renderConnections();
}

function switchConnection(connectionId) {
  activeConnectionId = connectionId;
  persistConnections();
  renderConnections();
  loadModels();
}

async function syncSessionMeta() {
  const session = getActiveSession();
  if (!session) return;
  session.connectionId = activeConnectionId;
  session.model = modelSelect.value || "";
  session.temperature = getTemperatureValue();
  session.updatedAt = new Date().toISOString();
  await saveSessionToDirectory(session);
}

async function loadModels() {
  const current = getCurrentConnection();
  if (!current) return;

  refreshModelsBtn.disabled = true;
  setStatus("Đang tải models...");
  try {
    const res = await fetch(endpoint(current.base, "models"), {
      headers: { Authorization: `Bearer ${current.token}` },
    });
    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    const groups = groupModelsByOwner(
      Array.isArray(data?.data) ? data.data : [],
    );
    modelSelect.innerHTML = "";
    mainModelSelect.innerHTML = "";
    for (const g of groups) {
      const og = document.createElement("optgroup");
      og.label = g.owner;
      for (const m of g.items) {
        const op = document.createElement("option");
        op.value = m.id;
        op.textContent = m.id;
        og.appendChild(op);

        const mainOp = document.createElement("option");
        mainOp.value = m.id;
        mainOp.textContent = `${g.owner} / ${m.id}`;
        mainModelSelect.appendChild(mainOp);
      }
      modelSelect.appendChild(og);
    }
    const activeSession = getActiveSession();
    if (activeSession?.model) {
      modelSelect.value = activeSession.model;
      mainModelSelect.value = activeSession.model;
    } else if (mainModelSelect.options.length > 0) {
      const first = mainModelSelect.options[0].value;
      modelSelect.value = first;
      mainModelSelect.value = first;
    }
    setStatus("Đã tải models", "success");
  } catch (err) {
    setStatus(`Lỗi models: ${err.message}`, "error");
  } finally {
    refreshModelsBtn.disabled = false;
  }
}

async function readImageAsDataUrl(file) {
  if (!file) return "";
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Không thể đọc ảnh"));
    reader.readAsDataURL(file);
  });
}

function clearImageSelection() {
  imageInput.value = "";
  imagePreview.src = "";
  imagePreviewWrap.classList.add("hidden");
  workspaceEl?.classList.remove("has-image-preview");
}

async function streamAssistantResponse(response, assistantNode) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Server không hỗ trợ stream");

  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const lineRaw of lines) {
      const line = lineRaw.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const chunk = JSON.parse(payload);
        const delta = chunk?.choices?.[0]?.delta?.content;
        if (typeof delta === "string") {
          fullText += delta;
          assistantNode.querySelector(".content").textContent = fullText;
        }
      } catch {
        continue;
      }
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  return fullText;
}

async function sendMessage(e) {
  e.preventDefault();

  const session = getActiveSession();
  const current = getCurrentConnection();
  if (!session || !current || !modelSelect.value) {
    setStatus("Thiếu session / kết nối / model", "error");
    return;
  }

  const text = userInput.value.trim();
  const file = imageInput.files?.[0] || null;
  if (!text && !file) {
    setStatus("Nhập nội dung hoặc chọn ảnh", "error");
    return;
  }

  sendBtn.disabled = true;
  addTypingIndicator();

  try {
    const imageUrl = await readImageAsDataUrl(file);
    const userContent = buildUserMessageContent(text, imageUrl);
    session.messages.push({ role: "user", content: userContent });
    updateSessionTitleFromMessage(session, text);
    session.updatedAt = new Date().toISOString();
    session.connectionId = activeConnectionId;
    session.model = modelSelect.value;
    session.stream = streamToggle.checked;
    session.temperature = getTemperatureValue();

    appendMessage("user", text || "(image)", imageUrl);

    updateHeroVisibility();
    userInput.value = "";
    clearImageSelection();

    const compactMessages = compactConversationMessages(session.messages, {
      maxRecentMessages: 12,
      maxCharsOlder: 1600,
    });
    const payload = buildChatRequest(modelSelect.value, compactMessages, {
      stream: streamToggle.checked,
      temperature: session.temperature,
    });

    const res = await fetch(endpoint(current.base, "chat/completions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${current.token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(await res.text());

    let assistantText = "";
    if (streamToggle.checked) {
      const node = appendMessage("assistant", "");
      assistantText = await streamAssistantResponse(res, node);
    } else {
      const data = await res.json();
      assistantText = parseAssistantContent(data);
      appendMessage("assistant", assistantText);
    }

    session.messages.push({ role: "assistant", content: assistantText });
    session.updatedAt = new Date().toISOString();
    sortSessionsInPlace();
    renderSessionList();
    chatTitleEl.textContent = "Hôm nay bạn muốn làm gì?";
    await saveSessionToDirectory(session);
    setStatus("Hoàn tất", "success");
  } catch (err) {
    session.messages.pop();
    const lastNode = messagesInnerEl.lastElementChild;
    if (lastNode?.classList?.contains("assistant")) {
      lastNode.remove();
    }
    const lastAfterAssistantRemoved = messagesInnerEl.lastElementChild;
    if (lastAfterAssistantRemoved?.classList?.contains("user")) {
      lastAfterAssistantRemoved.remove();
    }
    updateHeroVisibility();
    session.updatedAt = new Date().toISOString();
    await saveSessionToDirectory(session);
    setStatus(`Chat lỗi: ${err.message}`, "error");
  } finally {
    removeTypingIndicator();
    sendBtn.disabled = false;
  }
}

function initFromCache() {
  connections = parseConnections(
    localStorage.getItem(STORAGE_KEYS.connections),
  );
  activeConnectionId =
    localStorage.getItem(STORAGE_KEYS.activeConnectionId) || "";
  if (!getCurrentConnection() && connections.length > 0)
    activeConnectionId = connections[0].id;

  streamToggle.checked =
    localStorage.getItem(STORAGE_KEYS.streamEnabled) === "true";
  temperatureRange.value = String(
    normalizeTemperature(localStorage.getItem(STORAGE_KEYS.temperature), 0.7),
  );
  renderTemperatureValue();

  sessions = [];
  createNewSession();
  renderConnections();

  renderSessionList();
  switchSession(activeSessionId);
  updateFolderStatus();
}

saveSettingsBtn.addEventListener("click", saveConnection);
removeConnectionBtn.addEventListener("click", removeCurrentConnection);
refreshModelsBtn.addEventListener("click", loadModels);
openSettingsBtn.addEventListener("click", () => toggleSettingsDrawer(true));
closeSettingsBtn.addEventListener("click", () => toggleSettingsDrawer(false));
newChatBtn.addEventListener("click", createNewSession);
sidebarToggleBtn.addEventListener("click", () => {
  appShell.classList.toggle("sidebar-collapsed");
  sidebarEl.classList.toggle("collapsed");
});
pickFolderBtn.addEventListener("click", async () => {
  await pickHistoryFolder();
  await loadSessionsFromDirectory();
});
chatForm.addEventListener("submit", sendMessage);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});
connectionSelect.addEventListener("change", () =>
  switchConnection(connectionSelect.value),
);
quickConnectionSelect.addEventListener("change", () =>
  switchConnection(quickConnectionSelect.value),
);
mainConnectionSelect.addEventListener("change", async () => {
  switchConnection(mainConnectionSelect.value);
  await syncSessionMeta();
});

streamToggle.addEventListener("change", persistStreamSetting);
composerPlusBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  composerMenu1.classList.toggle("hidden");
});
addImageFileAction.addEventListener("click", () => {
  imageInput.click();
  composerMenu1.classList.add("hidden");
});
openProjectAction.addEventListener("click", async () => {
  composerMenu1.classList.add("hidden");
  await pickHistoryFolder();
  await loadSessionsFromDirectory();
});
openSettingsAction.addEventListener("click", () => {
  composerMenu1.classList.add("hidden");
  toggleSettingsDrawer(true);
});
settingsBackdrop.addEventListener("click", () => toggleSettingsDrawer(false));
renameSessionBtn.addEventListener("click", async () => {
  const session = sessions.find((s) => s.id === activeSessionMenuId);
  if (!session) return;
  const nextTitle = window.prompt("Đổi tên đoạn chat", session.title || "");
  if (!nextTitle || !nextTitle.trim()) return;
  session.title = nextTitle.trim();
  session.updatedAt = new Date().toISOString();
  hideSessionActionMenu();
  sortSessionsInPlace();
  renderSessionList();
  await saveSessionToDirectory(session);
});
pinSessionBtn.addEventListener("click", async () => {
  const session = sessions.find((s) => s.id === activeSessionMenuId);
  if (!session) return;
  session.pinned = !session.pinned;
  session.updatedAt = new Date().toISOString();
  hideSessionActionMenu();
  sortSessionsInPlace();
  renderSessionList();
  await saveSessionToDirectory(session);
});
deleteSessionBtn.addEventListener("click", async () => {
  const sessionId = activeSessionMenuId;
  if (!sessionId) return;
  sessions = sessions.filter((s) => s.id !== sessionId);
  hideSessionActionMenu();
  if (historyDirHandle) {
    try {
      await historyDirHandle.removeEntry(`${sessionId}.json`);
    } catch {
      // ignore missing file
    }
  }

  if (sessions.length === 0) {
    createNewSession();
  } else {
    sortSessionsInPlace();
    activeSessionId = sessions[0].id;
    renderSessionList();
    renderMessages();
  }
});
document.addEventListener("click", (e) => {
  if (!chatForm.contains(e.target)) {
    composerMenu1.classList.add("hidden");
  }

  if (
    !sessionActionMenu.contains(e.target) &&
    !e.target.classList?.contains("session-more")
  ) {
    hideSessionActionMenu();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    toggleSettingsDrawer(false);
    hideSessionActionMenu();
  }
});
clearImageBtn.addEventListener("click", clearImageSelection);
imageInput.addEventListener("change", async () => {
  const file = imageInput.files?.[0];
  if (!file) return clearImageSelection();
  const dataUrl = await readImageAsDataUrl(file);
  imagePreview.src = dataUrl;
  imagePreviewWrap.classList.remove("hidden");
  workspaceEl?.classList.add("has-image-preview");
  messagesEl.scrollTop = messagesEl.scrollHeight;
});
modelSelect.addEventListener("change", async () => {
  if (!activeConnectionId) return;
  mainModelSelect.value = modelSelect.value;
  connections = updateConnectionModel(
    connections,
    activeConnectionId,
    modelSelect.value || "",
  );
  persistConnections();
  await syncSessionMeta();
});
mainModelSelect.addEventListener("change", async () => {
  if (!activeConnectionId) return;
  modelSelect.value = mainModelSelect.value;
  connections = updateConnectionModel(
    connections,
    activeConnectionId,
    mainModelSelect.value || "",
  );
  persistConnections();
  await syncSessionMeta();
});
temperatureRange.addEventListener("input", renderTemperatureValue);
temperatureRange.addEventListener("change", async () => {
  localStorage.setItem(STORAGE_KEYS.temperature, String(getTemperatureValue()));
  await syncSessionMeta();
});

async function bootstrap() {
  initFromCache();
  hideSessionActionMenu();
  updateHeroVisibility();
  await restoreHistoryFolderFromCache();
  if (getCurrentConnection()) loadModels();
}

bootstrap();
