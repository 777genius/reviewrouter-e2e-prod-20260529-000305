# Disposable webhook review subject

This independent TEST subject checks whether webhook signature validation precedes
durable event ingestion and processing. It is separate from the previous coupon,
room, warehouse and cache subjects. It uses no previous review input or state.

The handler records an `invoice.paid` event and enqueues it before verifying the
HMAC signature over the raw request body. A caller can change `amountCents` while
retaining the signature of the original body. The HTTP response is 401, but the
tampered event has already entered both the durable inbox and processing queue.

Expected review finding: reject an invalid signature before either durable write
or enqueue operation. A rejected webhook must leave both unchanged. This is an
authorization-order defect, not an issue with the HMAC comparison itself.

`webhook-counterexample.mts` uses an isolated in-memory store to demonstrate the
effect boundary: a valid signed event produces 202, while a tampered event produces
401 yet remains persisted and queued. Its successful assertions reproduce the
defect; they do not claim the handler is correct. No server, provider, database,
credential or network connection is needed. With a compatible TypeScript runner,
run the counterexample directly; Node with built-in TypeScript stripping can use
`node --experimental-strip-types webhook-counterexample.mts`.

Future review scope is ONE finding-discovery provider request against this new
subject's exact immutable Git head/tree and independently created assignment.
Existing funded assignments and UNKNOWN outcomes remain frozen. These source
files grant no launch authority, create no funding, and alter no allocation policy.
