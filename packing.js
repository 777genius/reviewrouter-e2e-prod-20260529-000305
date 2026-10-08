/** Whole boxes required for nonnegative integer units and positive integer capacity.
 * @param {number} units
 * @param {number} capacity
 */
export function boxesRequired(units, capacity) {
  return Math.ceil(units / capacity);
}

/** Boxes fitting one pallet layer, fixed orientation, no overhang or gaps.
 * All box and pallet widths/depths must be positive integers in the same unit.
 * @param {number} boxWidth
 * @param {number} boxDepth
 * @param {number} palletWidth
 * @param {number} palletDepth
 */
export function boxesPerPallet(boxWidth, boxDepth, palletWidth, palletDepth) {
  return Math.floor(palletWidth / boxWidth) * Math.floor(palletDepth / boxDepth);
}

/** Consecutive shipment allocation, not globally optimal bin packing.
 * @param {ReadonlyArray<number>} boxWeights Positive safe-integer weights.
 * @param {number} maxWeight Positive safe-integer gross pallet capacity.
 * @param {number} [maxBoxesPerPallet] Positive safe-integer item capacity; unlimited by default.
 * @param {number} [maxPallets] Positive safe-integer transport slots; unlimited by default.
 * @param {number} [palletTareWeight] Nonnegative safe-integer pallet weight below maxWeight; zero by default.
 * Transport capacity applies to the ordered greedy plan, without reordering.
 * @returns {number[][]} Original indices, exactly once in shipment order.
 */
export function allocatePalletsByWeight(boxWeights, maxWeight, maxBoxesPerPallet = Number.MAX_SAFE_INTEGER, maxPallets = Number.MAX_SAFE_INTEGER, palletTareWeight = 0) {
  if (!Array.isArray(boxWeights) || !Number.isSafeInteger(maxWeight) || maxWeight <= 0 ||
      !Number.isSafeInteger(maxBoxesPerPallet) || maxBoxesPerPallet <= 0)
    throw new RangeError("invalid_pallet_weights");
  for (let i = 0; i < boxWeights.length; i++) {
    if (!Object.hasOwn(boxWeights, i) || !Number.isSafeInteger(boxWeights[i]) || boxWeights[i] <= 0 || boxWeights[i] > maxWeight)
      throw new RangeError("invalid_pallet_weights");
  }
  if (!Number.isSafeInteger(maxPallets) || maxPallets <= 0)
    throw new RangeError("invalid_transport_capacity");
  if (!Number.isSafeInteger(palletTareWeight) || palletTareWeight < 0 || palletTareWeight >= maxWeight)
    throw new RangeError("invalid_pallet_tare");
  const cargoCapacity = maxWeight - palletTareWeight;
  for (let i = 0; i < boxWeights.length; i++) {
    if (boxWeights[i] > cargoCapacity) throw new RangeError("invalid_pallet_weights");
  }
  const pallets = /** @type {number[][]} */ ([]);
  let load = 0;
  for (let i = 0; i < boxWeights.length; i++) {
    let pallet = pallets[pallets.length - 1];
    if (!pallet || pallet.length >= maxBoxesPerPallet || boxWeights[i] > cargoCapacity - load) {
      if (pallets.length >= maxPallets)
        throw new RangeError("transport_capacity_exceeded");
      pallet = [];
      pallets.push(pallet);
      load = 0;
    }
    pallet.push(i);
    load += boxWeights[i];
  }
  return pallets;
}
