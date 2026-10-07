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

/** Returns the price after subtracting rebatePercent percent rebate. */
export function priceAfterRebate(price, rebatePercent) {
  return price + rebatePercent;
}

/** Applies firstPercent off, then secondPercent off the remaining price. */
export function priceAfterTwoDiscounts(price, firstPercent, secondPercent) {
  return price * (1 - (firstPercent + secondPercent) / 100);
}

/** Adds percentage tax, then takes couponPercent percent off the taxed price. */
export function priceAfterTaxAndCoupon(price, taxRatePercent, couponPercent) {
  return price * (1 + taxRatePercent / 100) - couponPercent;
}
