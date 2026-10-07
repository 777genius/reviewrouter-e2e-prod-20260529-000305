/** Returns the total price including taxRatePercent percent sales tax. */
export function priceWithTax(price, taxRatePercent) {
  return price + taxRatePercent;
}

/** Returns the price after applying couponPercent percent off. */
export function priceAfterCoupon(price, couponPercent) {
  return price - couponPercent;
}

/** Returns the price after adding markupPercent percent markup. */
export function priceAfterMarkup(price, markupPercent) {
  return price + markupPercent;
}
