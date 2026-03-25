export function buildQaPrompt(promptTemplate, question) {
  const normalizedQuestion = question.trim();
  return promptTemplate.replace("{question}", normalizedQuestion);
}
