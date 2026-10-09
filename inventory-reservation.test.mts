import assert from "node:assert/strict";
import test from "node:test";
import { InventoryReservation, type ReservationRequest } from "./inventory-reservation.mts";

test("batch commits multiple SKUs in input order without touching unrelated stock", () => {
  const inventory = new InventoryReservation({ apple: 10, pear: 6, plum: 4 });
  assert.deepEqual(inventory.reserveBatch([
    { requestKey: "basket-apple", sku: "apple", quantity: 3 },
    { requestKey: "basket-pear", sku: "pear", quantity: 2 },
  ]), [
    { requestKey: "basket-apple", sku: "apple", quantity: 3, remaining: 7 },
    { requestKey: "basket-pear", sku: "pear", quantity: 2, remaining: 4 },
  ]);
  assert.equal(inventory.available("apple"), 7);
  assert.equal(inventory.available("pear"), 4);
  assert.equal(inventory.available("plum"), 4);
});

test("distinct keys for the same SKU consume cumulative available stock", () => {
  const inventory = new InventoryReservation({ apple: 5 });
  assert.deepEqual(inventory.reserveBatch([
    { requestKey: "first", sku: "apple", quantity: 2 },
    { requestKey: "second", sku: "apple", quantity: 3 },
  ]).map((receipt) => receipt.remaining), [3, 0]);
  assert.equal(inventory.available("apple"), 0);
});

test("identical keys inside a batch debit once and return independent receipt copies", () => {
  const inventory = new InventoryReservation({ apple: 5 });
  const request = { requestKey: "same", sku: "apple", quantity: 2 };
  const receipts = inventory.reserveBatch([request, request]);
  assert.deepEqual(receipts, [
    { ...request, remaining: 3 },
    { ...request, remaining: 3 },
  ]);
  assert.notEqual(receipts[0], receipts[1]);
  assert.equal(inventory.available("apple"), 3);
  Object.assign(receipts[0]!, { remaining: 999, quantity: 999 });
  assert.deepEqual(inventory.reserveBatch([request]), [{ ...request, remaining: 3 }]);
});

test("replaying a completed batch is a no-op even when stock is now exhausted", () => {
  const inventory = new InventoryReservation({ apple: 2, pear: 1 });
  const batch = [
    { requestKey: "apple", sku: "apple", quantity: 2 },
    { requestKey: "pear", sku: "pear", quantity: 1 },
  ];
  const first = inventory.reserveBatch(batch);
  assert.deepEqual(inventory.reserveBatch(batch), first);
  assert.equal(inventory.available("apple"), 0);
  assert.equal(inventory.available("pear"), 0);
});

test("batch honors prior single reservations and leaves the single API usable", () => {
  const inventory = new InventoryReservation({ apple: 8 });
  const single = inventory.reserve({ requestKey: "single", sku: "apple", quantity: 2 });
  assert.deepEqual(inventory.reserveBatch([
    { requestKey: "single", sku: "apple", quantity: 2 },
    { requestKey: "batch", sku: "apple", quantity: 3 },
  ]), [single, { requestKey: "batch", sku: "apple", quantity: 3, remaining: 3 }]);
  assert.deepEqual(inventory.reserve({ requestKey: "batch", sku: "apple", quantity: 3 }),
    { requestKey: "batch", sku: "apple", quantity: 3, remaining: 3 });
  assert.equal(inventory.available("apple"), 3);
});

for (const conflicting of [
  { requestKey: "existing", sku: "pear", quantity: 1 },
  { requestKey: "existing", sku: "apple", quantity: 2 },
]) {
  test(`prior-key ${conflicting.sku}/${conflicting.quantity} conflict rolls back earlier batch work`, () => {
    const inventory = new InventoryReservation({ apple: 5, pear: 5 });
    inventory.reserve({ requestKey: "existing", sku: "apple", quantity: 1 });
    assert.throws(() => inventory.reserveBatch([
      { requestKey: "new", sku: "pear", quantity: 2 }, conflicting,
    ]), /reservation_conflict/);
    assert.equal(inventory.available("apple"), 4);
    assert.equal(inventory.available("pear"), 5);
    // A different payload can use "new": the rejected batch did not persist its receipt.
    assert.deepEqual(inventory.reserveBatch([{ requestKey: "new", sku: "pear", quantity: 1 }]),
      [{ requestKey: "new", sku: "pear", quantity: 1, remaining: 4 }]);
  });
}

test("conflicting duplicate inside a batch rolls back both stock and receipts", () => {
  const inventory = new InventoryReservation({ apple: 5, pear: 5 });
  assert.throws(() => inventory.reserveBatch([
    { requestKey: "same", sku: "apple", quantity: 1 },
    { requestKey: "same", sku: "pear", quantity: 1 },
  ]), /reservation_conflict/);
  assert.equal(inventory.available("apple"), 5);
  assert.equal(inventory.available("pear"), 5);
  assert.equal(inventory.reserveBatch([{ requestKey: "same", sku: "pear", quantity: 2 }])[0]?.remaining, 3);
});

for (const invalid of [
  { requestKey: "", sku: "apple", quantity: 1 },
  { requestKey: "bad", sku: "apple", quantity: 0 },
  { requestKey: "bad", sku: "apple", quantity: -1 },
  { requestKey: "bad", sku: "apple", quantity: 1.5 },
  { requestKey: "bad", sku: "apple", quantity: Number.MAX_SAFE_INTEGER + 1 },
  null,
] as const) {
  test(`invalid later item ${JSON.stringify(invalid)} leaves no partial reservation`, () => {
    const inventory = new InventoryReservation({ apple: 5 });
    assert.throws(() => inventory.reserveBatch([
      { requestKey: "first", sku: "apple", quantity: 2 },
      invalid as unknown as ReservationRequest,
    ]), /invalid_reservation/);
    assert.equal(inventory.available("apple"), 5);
    assert.equal(inventory.reserveBatch([{ requestKey: "first", sku: "apple", quantity: 1 }])[0]?.remaining, 4);
  });
}

for (const last of [
  { requestKey: "last", sku: "apple", quantity: 4 },
  { requestKey: "last", sku: "missing", quantity: 1 },
]) {
  test(`later ${last.sku} shortage rolls back cumulative same-SKU work`, () => {
    const inventory = new InventoryReservation({ apple: 5 });
    assert.throws(() => inventory.reserveBatch([
      { requestKey: "first", sku: "apple", quantity: 2 }, last,
    ]), /insufficient_stock/);
    assert.equal(inventory.available("apple"), 5);
    assert.equal(inventory.available("missing"), undefined);
    assert.equal(inventory.reserveBatch([{ requestKey: "first", sku: "apple", quantity: 1 }])[0]?.remaining, 4);
  });
}

test("an empty batch is a no-op; a non-array batch is rejected without changes", () => {
  const inventory = new InventoryReservation({ apple: 3 });
  assert.deepEqual(inventory.reserveBatch([]), []);
  assert.throws(() => inventory.reserveBatch(null as unknown as readonly ReservationRequest[]),
    /invalid_reservation_batch/);
  assert.equal(inventory.available("apple"), 3);
});
