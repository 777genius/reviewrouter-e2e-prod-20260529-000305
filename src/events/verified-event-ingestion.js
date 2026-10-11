/**
 * Ingest a provider event only after authentication has succeeded.
 *
 * inbox.insertIfAbsent durably inserts a row keyed by event.id and returns
 * { inserted: false } when that authenticated ID has already been accepted.
 * queue.enqueue durably schedules the associated business effect.
 */
export async function ingestVerifiedEvent(event, { authenticate, inbox, queue }) {
  if (!(await authenticate(event))) {
    return { status: 401 };
  }

  await inbox.insertIfAbsent({ id: event.id, payload: event.payload });
  await queue.enqueue({ eventId: event.id, payload: event.payload });
  return { status: 202 };
}
