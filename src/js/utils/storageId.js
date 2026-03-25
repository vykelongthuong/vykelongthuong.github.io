function sanitizeId(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\s+/g, "-");
}

export function buildStorageIdentity(rawInput, fallbackName = "story") {
  const safeInput = typeof rawInput === "string" ? rawInput.trim() : "";
  const normalized = sanitizeId(safeInput);

  if (safeInput.startsWith("http://") || safeInput.startsWith("https://")) {
    return {
      id: normalized,
      sourceUrl: safeInput,
    };
  }

  if (normalized) {
    return {
      id: normalized,
      sourceUrl: "",
    };
  }

  const safeFallback = sanitizeId(fallbackName) || "story";
  const generatedId = `${safeFallback}-${Date.now()}`;
  return {
    id: generatedId,
    sourceUrl: "",
  };
}
