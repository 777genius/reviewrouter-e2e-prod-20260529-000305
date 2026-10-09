# Atomic warehouse stock transfers

Review the new standalone `WarehouseTransfers` API and its behavior tests.
It supports warehouse rebalancing by transferring an existing SKU between
locations; it does not reserve inventory or change the existing reservation APIs.

Contract:

- A transfer decreases source stock and increases destination stock by the same
  positive safe-integer quantity. Both changes commit together or neither does.
- An absent destination warehouse or SKU starts at zero and is created only on success.
- An unknown or insufficient source rejects. Destination safe-integer overflow
  rejects without debiting the source.
- Warehouse names, SKU and transfer key must be nonempty strings. Source and
  destination must differ. Initial quantities must be nonnegative safe integers.
- Each transfer key is permanently bound to SKU, source, destination and quantity
  after success. Exact replay returns the original receipt without moving stock;
  a changed payload rejects a conflict. Rejections do not consume a new key.
- Receipts and constructor inputs must not expose mutable stored state. A receipt
  reports balances immediately after its original transfer, not current balances.
- Preserve all existing repository features and files. This is a new warehouse
  movement capability, not a replay of single or batch reservation review.

Report actionable correctness findings against this transfer contract. Do not modify code.
