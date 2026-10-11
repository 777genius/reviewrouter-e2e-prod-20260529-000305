import { createHmac, timingSafeEqual } from "node:crypto";

export interface InvoicePaidEvent {
  id: string;
  type: "invoice.paid";
  accountId: string;
  amountCents: number;
}

export interface DurableWebhookStore {
  recordIncomingEvent(event: InvoicePaidEvent): Promise<void>;
  enqueueForProcessing(eventId: string): Promise<void>;
}

function parseEvent(rawBody: Uint8Array): InvoicePaidEvent {
  const value: unknown = JSON.parse(Buffer.from(rawBody).toString("utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("invalid_event");
  const event = value as Record<string, unknown>;
  if (typeof event.id !== "string" || !event.id || event.type !== "invoice.paid"
    || typeof event.accountId !== "string" || !event.accountId
    || !Number.isSafeInteger(event.amountCents) || Number(event.amountCents) <= 0) {
    throw Error("invalid_event");
  }
  return { id: event.id, type: event.type, accountId: event.accountId,
    amountCents: Number(event.amountCents) };
}

function signatureMatches(rawBody: Uint8Array, signature: string, signingSecret: string): boolean {
  if (!/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", signingSecret).update(rawBody).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"));
}

export async function handleWebhook(input: {
  rawBody: Uint8Array;
  signature: string;
  signingSecret: string;
}, store: DurableWebhookStore): Promise<{ status: 202 | 400 | 401 }> {
  let event: InvoicePaidEvent;
  try { event = parseEvent(input.rawBody); }
  catch { return { status: 400 }; }

  await store.recordIncomingEvent(event);
  await store.enqueueForProcessing(event.id);
  if (!signatureMatches(input.rawBody, input.signature, input.signingSecret)) {
    return { status: 401 };
  }
  return { status: 202 };
}
