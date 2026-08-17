type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonRecord : null;
}

export function extractInboundInstagramDm(payload: unknown) {
  const event = record(payload);
  const sender = record(event?.sender);
  const message = record(event?.message);
  const isEcho = message?.is_echo === true;
  if (!event || !sender || !message || isEcho || typeof sender.id !== "string" || typeof message.text !== "string") return null;
  return { externalUserId: sender.id, externalThreadId: sender.id, text: message.text.trim() };
}
