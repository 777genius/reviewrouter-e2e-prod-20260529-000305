export type Redemption = Readonly<{
  requestId: string;
  customerId: string;
  discountCents: number;
}>;

export type Coupon = Readonly<{
  code: string;
  discountCents: number;
  maxRedemptions: number;
  redemptions: readonly Redemption[];
}>;

export type RedemptionResult = Readonly<{
  coupon: Coupon;
  receipt: Redemption;
}>;

/** One synchronous state transition; caller persists the returned snapshot atomically.
 * Retrying a request must return its original receipt without consuming quota again.
 */
export function redeem(coupon: Coupon, requestId: string, customerId: string): RedemptionResult {
  if (!requestId.trim() || !customerId.trim()
      || !Number.isSafeInteger(coupon.maxRedemptions) || coupon.maxRedemptions < 1
      || !Number.isSafeInteger(coupon.discountCents) || coupon.discountCents < 1) {
    throw new Error("invalid_redemption");
  }
  if (coupon.redemptions.length >= coupon.maxRedemptions) {
    throw new Error("coupon_exhausted");
  }
  const previous = coupon.redemptions.find(receipt => receipt.requestId === requestId);
  if (previous) {
    if (previous.customerId !== customerId) throw new Error("request_conflict");
    return { coupon, receipt: previous };
  }
  const receipt: Redemption = { requestId, customerId, discountCents: coupon.discountCents };
  return { coupon: { ...coupon, redemptions: [...coupon.redemptions, receipt] }, receipt };
}
