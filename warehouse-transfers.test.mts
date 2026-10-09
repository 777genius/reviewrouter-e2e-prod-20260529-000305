import assert from "node:assert/strict";
import { test } from "node:test";
import { WarehouseTransfers, type TransferRequest } from "./warehouse-transfers.mts";

const request: TransferRequest = {
  transferKey: "move-1", sku: "widget", fromWarehouse: "north", toWarehouse: "south", quantity: 3,
};

test("moves stock atomically and conserves each SKU", () => {
  const stock = new WarehouseTransfers({ north: { widget: 10, cable: 4 }, south: { widget: 2, cable: 1 } });
  assert.deepEqual(stock.transfer(request), { ...request, sourceRemaining: 7, destinationRemaining: 5 });
  assert.equal(stock.available("north", "widget")! + stock.available("south", "widget")!, 12);
  assert.equal(stock.available("north", "cable"), 4);
  assert.equal(stock.available("south", "cable"), 1);
});

test("creates missing destinations without aliasing constructor input", () => {
  const input = { north: { widget: 3 } };
  const stock = new WarehouseTransfers(input);
  input.north.widget = 0;
  stock.transfer(request);
  assert.equal(stock.available("north", "widget"), 0);
  assert.equal(stock.available("south", "widget"), 3);
});

test("identical replay returns original balances without moving stock again", () => {
  const stock = new WarehouseTransfers({ north: { widget: 10 }, south: { widget: 0 } });
  const first = stock.transfer(request);
  stock.transfer({ ...request, transferKey: "move-2", quantity: 2 });
  const replay = stock.transfer({ ...request });
  assert.deepEqual(replay, first);
  assert.notEqual(replay, first);
  assert.equal(stock.available("north", "widget"), 5);
  assert.equal(stock.available("south", "widget"), 5);
});

test("returned receipt mutations do not affect stored receipts or stock", () => {
  const stock = new WarehouseTransfers({ north: { widget: 10 } });
  const receipt = stock.transfer(request);
  Object.assign(receipt, { sku: "other", quantity: 99, sourceRemaining: 99 });
  assert.deepEqual(stock.transfer(request), { ...request, sourceRemaining: 7, destinationRemaining: 3 });
  assert.equal(stock.available("north", "widget"), 7);
});

test("a key is bound to every transfer payload field", () => {
  for (const change of [{ sku: "cable" }, { fromWarehouse: "east" }, { toWarehouse: "west" }, { quantity: 2 }]) {
    const stock = new WarehouseTransfers({ north: { widget: 10, cable: 8 }, east: { widget: 5 } });
    stock.transfer(request);
    assert.throws(() => stock.transfer({ ...request, ...change }), /^Error: transfer_conflict$/);
    assert.equal(stock.available("north", "widget"), 7);
    assert.equal(stock.available("south", "widget"), 3);
    assert.equal(stock.available("east", "widget"), 5);
    assert.equal(stock.available("west", "widget"), undefined);
  }
});

test("insufficient or missing source rejects with no destination creation or consumed key", () => {
  const stock = new WarehouseTransfers({ north: { widget: 3 } });
  assert.throws(() => stock.transfer({ ...request, quantity: 4 }), /^Error: insufficient_stock$/);
  assert.equal(stock.available("north", "widget"), 3);
  assert.equal(stock.available("south", "widget"), undefined);
  assert.throws(() => stock.transfer({ ...request, fromWarehouse: "missing" }), /^Error: insufficient_stock$/);
  assert.throws(() => stock.transfer({ ...request, sku: "missing" }), /^Error: insufficient_stock$/);
  assert.equal(stock.transfer(request).destinationRemaining, 3);
});

test("destination overflow rejects both mutations and does not consume the key", () => {
  const stock = new WarehouseTransfers({ north: { widget: 10 }, south: { widget: Number.MAX_SAFE_INTEGER } });
  assert.throws(() => stock.transfer(request), /^Error: stock_overflow$/);
  assert.equal(stock.available("north", "widget"), 10);
  assert.equal(stock.available("south", "widget"), Number.MAX_SAFE_INTEGER);
  stock.transfer({ ...request, transferKey: "free-space", fromWarehouse: "south", toWarehouse: "third" });
  assert.equal(stock.transfer(request).sourceRemaining, 7);
});

test("rejects invalid transfers without changing stock or consuming a key", () => {
  const invalid: TransferRequest[] = [
    { ...request, transferKey: "" }, { ...request, sku: "" },
    { ...request, fromWarehouse: "" }, { ...request, toWarehouse: "" },
    { ...request, toWarehouse: "north" },
    ...[0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1].map(quantity => ({ ...request, quantity })),
  ];
  for (const candidate of invalid) {
    const stock = new WarehouseTransfers({ north: { widget: 10 } });
    assert.throws(() => stock.transfer(candidate), /^Error: invalid_transfer$/);
    assert.equal(stock.available("north", "widget"), 10);
    assert.equal(stock.available("south", "widget"), undefined);
    assert.equal(stock.transfer(request).sourceRemaining, 7);
  }
});

test("rejects invalid initial stock", () => {
  for (const quantity of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => new WarehouseTransfers({ north: { widget: quantity } }), /^Error: invalid_stock$/);
  }
  assert.throws(() => new WarehouseTransfers({ "": { widget: 1 } }), /^Error: invalid_stock$/);
  assert.throws(() => new WarehouseTransfers({ north: { "": 1 } }), /^Error: invalid_stock$/);
});
