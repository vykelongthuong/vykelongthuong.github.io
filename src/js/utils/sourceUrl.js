export function normalizeSourceUrl(rawUrl) {
  if (typeof rawUrl !== "string") return "";

  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    const pathname = parsed.pathname.replace(/\/+$/, "");
    parsed.pathname = pathname || "/";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function findDuplicateSourceUrl(records = [], rawUrl, ignoreId = "") {
  const normalizedTarget = normalizeSourceUrl(rawUrl);
  if (!normalizedTarget) return null;

  return (
    records.find((record) => {
      if (!record || typeof record !== "object") return false;
      if (ignoreId && (record.id || "") === ignoreId) return false;
      const normalizedRecordUrl = normalizeSourceUrl(record.sourceUrl || "");
      return normalizedRecordUrl === normalizedTarget;
    }) || null
  );
}
