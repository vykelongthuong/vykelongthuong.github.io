import { setApiKey, setSelectedModel, setApiBaseUrl, state } from "../state.js";

const API_KEY_STORAGE = "localLlmApiKey";
const MODEL_STORAGE = "localLlmModel";
const API_BASE_URL_STORAGE = "localLlmApiBaseUrl";
const DEFAULT_API_BASE_URL = "https://rwkl5qt.9router.com";

export function loadApiKeyFromCache() {
  const savedKey = localStorage.getItem(API_KEY_STORAGE) || "";
  setApiKey(savedKey);
  const savedModel = localStorage.getItem(MODEL_STORAGE) || "";
  setSelectedModel(savedModel);
  const savedApiBaseUrl =
    localStorage.getItem(API_BASE_URL_STORAGE) || DEFAULT_API_BASE_URL;
  setApiBaseUrl(savedApiBaseUrl);
}

export function saveApiKeyToCache(apiKey) {
  localStorage.setItem(API_KEY_STORAGE, apiKey);
  setApiKey(apiKey);
}

export function saveSelectedModelToCache(model) {
  localStorage.setItem(MODEL_STORAGE, model);
  setSelectedModel(model);
}

export function saveApiBaseUrlToCache(apiBaseUrl) {
  const nextValue = (apiBaseUrl || "").trim() || DEFAULT_API_BASE_URL;
  localStorage.setItem(API_BASE_URL_STORAGE, nextValue);
  setApiBaseUrl(nextValue);
}

export function getCachedSelectedModel() {
  return state.selectedModel || "";
}

export function getCachedApiBaseUrl() {
  return state.apiBaseUrl || DEFAULT_API_BASE_URL;
}

export { DEFAULT_API_BASE_URL };
