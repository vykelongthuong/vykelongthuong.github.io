export function parseSrt(data) {
  const blocks = data.trim().replace(/\r/g, "").split("\n\n");
  return blocks
    .map((block) => {
      const lines = block.split("\n");
      if (lines.length < 2) return null;
      return {
        index: lines[0],
        timestamp: lines[1],
        text: lines.slice(2).join("\n"),
      };
    })
    .filter(Boolean);
}

export function reconstructSrt(originalSubs, translatedTexts) {
  return originalSubs
    .map((sub, i) => {
      const translatedText = translatedTexts[i] || sub.text;
      return `${sub.index}\n${sub.timestamp}\n${translatedText.trim()}`;
    })
    .join("\n\n");
}
