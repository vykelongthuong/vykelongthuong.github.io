function sanitizeFileSegment(value = "") {
  return String(value || "")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export function isManagedHistoryFile(fileName = "") {
  return /^(docx|srt)__.+\.json$/i.test(fileName);
}

export function buildHistoryFileName(type, entry, fallbackIndex = 0) {
  const segment =
    sanitizeFileSegment(entry?.id) ||
    sanitizeFileSegment(entry?.sourceUrl) ||
    sanitizeFileSegment(entry?.fileName) ||
    sanitizeFileSegment(entry?.name) ||
    `entry-${fallbackIndex + 1}`;

  return `${type}__${segment}.json`;
}

export function sortEntriesByDateDesc(entries = []) {
  return [...entries].sort((a, b) => {
    const timeA = Date.parse(a?.date || "") || 0;
    const timeB = Date.parse(b?.date || "") || 0;
    if (timeA !== timeB) return timeB - timeA;
    return String(a?.name || "").localeCompare(String(b?.name || ""), "vi");
  });
}

export function parseSingleHistoryFileContent(fileText = "", fileName = "") {
  let parsed;
  try {
    parsed = JSON.parse(fileText);
  } catch {
    return { docx: [], srt: [] };
  }

  if (parsed && typeof parsed === "object" && parsed.entry && parsed.type) {
    const type = parsed.type === "srt" ? "srt" : parsed.type === "docx" ? "docx" : "";
    if (!type) return { docx: [], srt: [] };
    return { [type]: [parsed.entry], [type === "docx" ? "srt" : "docx"]: [] };
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    (Array.isArray(parsed.docx) || Array.isArray(parsed.srt))
  ) {
    return {
      docx: Array.isArray(parsed.docx) ? parsed.docx : [],
      srt: Array.isArray(parsed.srt) ? parsed.srt : [],
    };
  }

  const inferredType = fileName.toLowerCase().startsWith("srt__")
    ? "srt"
    : "docx";
  return {
    docx: inferredType === "docx" ? [parsed] : [],
    srt: inferredType === "srt" ? [parsed] : [],
  };
}
