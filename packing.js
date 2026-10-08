/** Whole boxes required for nonnegative integer units and positive integer capacity. */
export function boxesRequired(units, capacity) {
  return Math.ceil(units / capacity);
}

/** Boxes fitting one pallet layer, fixed orientation, no overhang or gaps.
 * All box and pallet widths/depths must be positive integers in the same unit.
 */
export function boxesPerPallet(boxWidth, boxDepth, palletWidth, palletDepth) {
  return Math.floor(palletWidth / boxWidth) * Math.ceil(palletDepth / boxDepth);
}
