export type ReservationRequest = Readonly<{
  requestKey: string;
  sku: string;
  quantity: number;
}>;
export type ReservationReceipt = Readonly<ReservationRequest & { remaining: number }>;
export type StockBySku = Readonly<Record<string, number>>;

export class InventoryReservation {
  #stock: Map<string, number>;
  #receipts = new Map<string, ReservationReceipt>();

  constructor(stockBySku: StockBySku) {
    this.#stock = new Map(Object.entries(stockBySku));
    for (const quantity of this.#stock.values()) {
      if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error("invalid_stock");
    }
  }

  reserve({ requestKey, sku, quantity }: ReservationRequest): ReservationReceipt {
    if (typeof requestKey !== "string" || requestKey.length === 0 ||
        typeof sku !== "string" || !Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new Error("invalid_reservation");
    }
    const previous = this.#receipts.get(requestKey);
    if (previous) return { ...previous };
    const available = this.#stock.get(sku);
    if (available === undefined || available < quantity) throw new Error("insufficient_stock");
    this.#stock.set(sku, available - quantity);
    const receipt: ReservationReceipt = { requestKey, sku, quantity, remaining: available - quantity };
    this.#receipts.set(requestKey, receipt);
    return { ...receipt };
  }

  available(sku: string): number | undefined {
    return this.#stock.get(sku);
  }
}
