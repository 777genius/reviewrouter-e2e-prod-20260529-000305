/** Returns the total price including taxRatePercent percent sales tax. */
export function priceWithTax(price, taxRatePercent) {
  return price + taxRatePercent;
}
