export function buildQualityCheckPrompt(
  template,
  originalText,
  translatedText,
) {
  return template
    .replace("{original_text}", originalText)
    .replace("{translated_text}", translatedText);
}

export function buildRegenerationPrompt(
  template,
  originalText,
  translatedText,
  analysisText,
) {
  return template
    .replace("{original_text}", originalText)
    .replace("{first_translation}", translatedText)
    .replace("{editor_feedback}", analysisText);
}

export function pairChunksForRefine(originalChunks, translatedChunks) {
  if (!Array.isArray(originalChunks) || !Array.isArray(translatedChunks)) {
    throw new Error("Danh sách đoạn không hợp lệ để phân tích/dịch lại.");
  }

  if (originalChunks.length !== translatedChunks.length) {
    throw new Error(
      `Số đoạn gốc (${originalChunks.length}) không khớp số đoạn dịch (${translatedChunks.length}).`,
    );
  }

  return originalChunks.map((originalText, index) => ({
    index,
    originalText,
    translatedText: translatedChunks[index],
  }));
}

export function buildChunkAnalysisSummary(analysisChunks) {
  if (!Array.isArray(analysisChunks) || !analysisChunks.length) {
    return "";
  }

  return analysisChunks
    .map(
      (analysis, index) => `### Phân tích đoạn ${index + 1}\n${analysis || ""}`,
    )
    .join("\n\n");
}
