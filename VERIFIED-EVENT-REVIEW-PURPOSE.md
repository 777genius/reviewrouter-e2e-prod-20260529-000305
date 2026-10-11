# Verified-event deduplication review subject

This isolated subject concerns duplicate processing of already authenticated
provider events. The inbox contract provides a durable unique event-ID insert
and explicitly reports whether the row was inserted. The ingestion caller
ignores that result and schedules the business effect even when the event was
already accepted.

The offline counterexample submits the same valid event ID and payload twice.
Authentication succeeds twice, insertion reports `true` then `false`, and the
final state contains one inbox row but two identical queued effects. A duplicate
delivery should be acknowledged without scheduling another effect. This is a
sequential duplicate-delivery defect, not a claim about atomic insert/enqueue
transactions or crash recovery.

Run only the isolated proof with:

```sh
node --test test/verified-event-dedup-counterexample.test.js
```

The tests use in-memory adapters for the documented durable-inbox/queue
contracts. They perform no network, database, credential, provider, or paid
operations. The second test confirms authentication precedes all writes. This
subject is therefore distinct from the earlier signature-verification ordering
subject: no unauthenticated event is stored or enqueued here. Existing workflow,
package configuration, previous subjects, consumed executions, and paid grants
are not modified.
