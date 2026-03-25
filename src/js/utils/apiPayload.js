export function buildChatPayload({ model, prompt, systemMessage }) {
  return {
    model,
    messages: [
      {
        role: "system",
        content: systemMessage,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    stream: false,
  };
}
