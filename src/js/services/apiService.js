import { dom } from "../ui/dom.js";
import { getApiKey, getApiBaseUrl } from "../state.js";
import { buildChatPayload } from "../utils/apiPayload.js";

const DEFAULT_TOKEN = "hello";

function getAuthToken() {
  return getApiKey() || DEFAULT_TOKEN;
}

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${getAuthToken()}`,
  };
}

function getBaseUrl() {
  const value = getApiBaseUrl();
  return `${value || ""}`.trim().replace(/\/+$/, "");
}

export async function fetchModels() {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error("Vui lòng nhập API Base URL.");
  }

  const response = await fetch(`${baseUrl}/v1/models`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
  });
  if (!response.ok) {
    throw new Error(`Lỗi lấy models: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data || [];
}

export async function translateTextGoogle(text) {
  if (!text) return "";
  const targetLanguage = dom.languageSelect.value.split(" ")[0].toLowerCase();
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage.substring(
    0,
    2,
  )}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Lỗi Google Translate API: ${response.statusText}`);
  }
  const data = await response.json();
  return data[0].map((item) => item[0]).join("");
}

async function callLocalLlmApi(text, promptTemplate, statusCallback) {
  const statusHandler = statusCallback || (() => {});
  statusHandler("Đang xử lý với Local LLM...", true);
  const targetLanguage = dom.languageSelect.value;
  const model = dom.modelSelect?.value;
  if (!model) {
    throw new Error("Vui lòng chọn model.");
  }
  const prompt = promptTemplate
    .replace("{text}", text)
    .replace(/{language}/g, targetLanguage);
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error("Vui lòng nhập API Base URL.");
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(
      buildChatPayload({
        model,
        prompt,
        systemMessage: "Bạn là trợ lý dịch thuật chuyên nghiệp.",
      }),
    ),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Lỗi API: ${errorData.error?.message || response.statusText}`,
    );
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Phản hồi từ API không hợp lệ.");
  }
  return content;
}

export async function translateTextAI(text, promptTemplate, statusCallback) {
  return callLocalLlmApi(text, promptTemplate, statusCallback);
}
