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

  reserveBatch(requests: readonly ReservationRequest[]): ReservationReceipt[] {
    if (!Array.isArray(requests)) throw new Error("invalid_reservation_batch");
    const stock = new Map(this.#stock);
    const receipts = new Map(this.#receipts);
    const result: ReservationReceipt[] = [];
    for (const request of requests) {
      if (request === null || typeof request !== "object" ||
          typeof request.requestKey !== "string" || request.requestKey.length === 0 ||
          typeof request.sku !== "string" || !Number.isSafeInteger(request.quantity) ||
          request.quantity <= 0) {
        throw new Error("invalid_reservation");
      }
      const { requestKey, sku, quantity } = request;
      const previous = receipts.get(requestKey);
      if (previous) {
        if (previous.sku !== sku || previous.quantity !== quantity) {
          throw new Error("reservation_conflict");
        }
        result.push({ ...previous });
        continue;
      }
      const available = stock.get(sku);
      if (available === undefined || available < quantity) throw new Error("insufficient_stock");
      const receipt: ReservationReceipt = { requestKey, sku, quantity, remaining: available - quantity };
      stock.set(sku, receipt.remaining);
      receipts.set(requestKey, receipt);
      result.push({ ...receipt });
    }
    this.#stock = stock;
    this.#receipts = receipts;
    return result;
  }

  available(sku: string): number | undefined {
    return this.#stock.get(sku);
  }
}
