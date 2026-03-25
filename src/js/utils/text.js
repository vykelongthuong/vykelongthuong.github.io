export function extractTextFromHtml(htmlString) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    const contentSpan = doc.querySelector("span#content");
    if (contentSpan) {
      return contentSpan.innerText;
    }
    return doc.body.innerText;
  } catch (error) {
    console.error("Could not parse HTML, returning as plain text.", error);
    return htmlString;
  }
}

export function splitText(text, numParts) {
  if (numParts <= 1) return [text];
  const parts = new Array(numParts).fill("");
  const lines = text.split("\n");
  const totalLines = lines.length;

  lines.forEach((line, index) => {
    const partIndex = Math.min(
      Math.floor((index / totalLines) * numParts),
      numParts - 1
    );
    parts[partIndex] += `${line}\n`;
  });

  return parts.map((part) => part.trim());
}
