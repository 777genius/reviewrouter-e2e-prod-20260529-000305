import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { handleWebhook, type DurableWebhookStore, type InvoicePaidEvent } from "../src/webhooks/webhook-handler.ts";

function isolatedStore() {
  const persisted: InvoicePaidEvent[] = [];
  const queued: string[] = [];
  const store: DurableWebhookStore = {
    async recordIncomingEvent(event) { persisted.push(structuredClone(event)); },
    async enqueueForProcessing(eventId) { queued.push(eventId); },
  };
  return { store, persisted, queued };
}

// Public disposable fixture secret, never a real provider credential.
const signingSecret = "offline-disposable-webhook-fixture-only";
const original = { id: "evt-webhook-independent-001", type: "invoice.paid",
  accountId: "acct-disposable-webhook", amountCents: 2500 };
const originalBody = Buffer.from(JSON.stringify(original));
const signature = `sha256=${createHmac("sha256", signingSecret).update(originalBody).digest("hex")}`;

const valid = isolatedStore();
assert.deepEqual(await handleWebhook({ rawBody: originalBody, signature, signingSecret }, valid.store), { status: 202 });
assert.deepEqual(valid.persisted, [original]);
assert.deepEqual(valid.queued, [original.id]);

const tampered = { ...original, amountCents: 250000 };
const invalid = isolatedStore();
const response = await handleWebhook({ rawBody: Buffer.from(JSON.stringify(tampered)),
  signature, signingSecret }, invalid.store);
assert.deepEqual(response, { status: 401 });
// Counterexample: rejection arrives after both durable-processing effects.
assert.deepEqual(invalid.persisted, [tampered]);
assert.deepEqual(invalid.queued, [tampered.id]);
console.log(JSON.stringify({ kind: "webhook_signature_order_counterexample",
  responseStatus: response.status, unauthorizedEventPersisted: invalid.persisted.length === 1,
  unauthorizedEventQueued: invalid.queued.length === 1,
  networkUsed: false, credentialsUsed: false, paidExecuted: false }));
