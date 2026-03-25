import { buildStorageIdentity } from "./storageId.js";

export function resolveStorageIdentityForManualSave(
  rawInput,
  { currentId = "", fallbackName = "story" } = {},
) {
  const safeInput = typeof rawInput === "string" ? rawInput.trim() : "";
  const hasCurrentId = typeof currentId === "string" && currentId.trim() !== "";

  if (!safeInput) {
    return {
      id: hasCurrentId ? currentId.trim() : buildStorageIdentity("", fallbackName).id,
      sourceUrl: "",
    };
  }

  if (safeInput.startsWith("http://") || safeInput.startsWith("https://")) {
    return {
      id: hasCurrentId ? currentId.trim() : buildStorageIdentity(safeInput, fallbackName).id,
      sourceUrl: safeInput,
    };
  }

  if (hasCurrentId) {
    return {
      id: currentId.trim(),
      sourceUrl: "",
    };
  }

  return buildStorageIdentity(safeInput, fallbackName);
}
