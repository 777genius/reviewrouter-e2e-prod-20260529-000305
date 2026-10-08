/** Whole boxes required for nonnegative integer units and positive integer capacity. */
export function boxesRequired(units, capacity) {
  return Math.floor(units / capacity);
}
