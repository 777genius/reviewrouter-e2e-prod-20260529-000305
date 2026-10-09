# Atomic inventory basket reservations

Review the newly added `InventoryReservation.reserveBatch` API and its behavior tests.
This feature lets a customer reserve a basket spanning multiple SKUs without leaving
partial reservations when a later item cannot be fulfilled.

Contract:

- Process requests in input order. Return one receipt per input item in that order.
- Commit all stock and new receipt changes together, or commit none on any error.
- Distinct request keys sharing a SKU must use cumulative available stock.
- Identical repeated key/SKU/quantity requests, including earlier single reservations,
  return the original receipt without another debit. Returned receipt objects must not
  let callers mutate stored receipts or other returned receipts.
- Reusing a key with different SKU or quantity rejects a conflict without partial changes.
- Invalid requests and insufficient or unknown stock reject without partial changes.
- An empty batch is a no-op. A non-array input rejects.
- Preserve the existing single-reservation API. This assignment is not a replay of the
  earlier single-reservation review or a request to fix unrelated existing behavior.

Report actionable correctness findings against this batch contract. Do not modify code.
