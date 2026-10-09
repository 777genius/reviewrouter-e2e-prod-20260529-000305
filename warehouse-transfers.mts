export type TransferRequest = Readonly<{
  transferKey: string;
  sku: string;
  fromWarehouse: string;
  toWarehouse: string;
  quantity: number;
}>;
export type TransferReceipt = Readonly<TransferRequest & {
  sourceRemaining: number;
  destinationRemaining: number;
}>;
export type WarehouseStock = Readonly<Record<string, Readonly<Record<string, number>>>>;

/** In-memory stock rebalancing. Each transfer commits both sides together. */
export class WarehouseTransfers {
  #stock = new Map<string, Map<string, number>>();
  #receipts = new Map<string, TransferReceipt>();

  constructor(stock: WarehouseStock) {
    for (const [warehouse, quantities] of Object.entries(stock)) {
      if (!warehouse || quantities === null || typeof quantities !== "object" || Array.isArray(quantities)) {
        throw new Error("invalid_stock");
      }
      const bySku = new Map<string, number>();
      for (const [sku, quantity] of Object.entries(quantities)) {
        if (!sku || !Number.isSafeInteger(quantity) || quantity < 0) throw new Error("invalid_stock");
        bySku.set(sku, quantity);
      }
      this.#stock.set(warehouse, bySku);
    }
  }

  transfer(request: TransferRequest): TransferReceipt {
    if (request === null || typeof request !== "object") throw new Error("invalid_transfer");
    const { transferKey, sku, fromWarehouse, toWarehouse, quantity } = request;
    if (typeof transferKey !== "string" || !transferKey || typeof sku !== "string" || !sku ||
        typeof fromWarehouse !== "string" || !fromWarehouse ||
        typeof toWarehouse !== "string" || !toWarehouse || fromWarehouse === toWarehouse ||
        !Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new Error("invalid_transfer");
    }
    const previous = this.#receipts.get(transferKey);
    if (previous) {
      if (previous.sku !== sku || previous.fromWarehouse !== fromWarehouse ||
          previous.toWarehouse !== toWarehouse || previous.quantity !== quantity) {
        throw new Error("transfer_conflict");
      }
      return { ...previous };
    }
    const source = this.#stock.get(fromWarehouse);
    const available = source?.get(sku);
    if (available === undefined || available < quantity) throw new Error("insufficient_stock");
    const destination = this.#stock.get(toWarehouse);
    const destinationRemaining = (destination?.get(sku) ?? 0) + quantity;
    if (!Number.isSafeInteger(destinationRemaining)) throw new Error("stock_overflow");
    const receipt: TransferReceipt = {
      transferKey, sku, fromWarehouse, toWarehouse, quantity,
      sourceRemaining: available - quantity, destinationRemaining,
    };
    // No validation or user callbacks after the first mutation. Missing
    // destinations are created only once the whole transfer can succeed.
    const target = destination ?? new Map<string, number>();
    source!.set(sku, receipt.sourceRemaining);
    target.set(sku, receipt.destinationRemaining);
    this.#stock.set(toWarehouse, target);
    this.#receipts.set(transferKey, receipt);
    return { ...receipt };
  }

  available(warehouse: string, sku: string): number | undefined {
    return this.#stock.get(warehouse)?.get(sku);
  }
}
