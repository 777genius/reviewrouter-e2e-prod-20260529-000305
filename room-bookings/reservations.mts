export type Booking = Readonly<{ roomId: string; startMs: number; endMs: number }>;

export function reserve(existing: readonly Booking[], requested: Booking): readonly Booking[] {
  if (!Number.isSafeInteger(requested.startMs) || !Number.isSafeInteger(requested.endMs)
      || requested.startMs >= requested.endMs) throw Error("invalid_interval");
  // Half-open intervals allow one meeting to start exactly when another ends.
  const conflict = existing.some(booking => booking.roomId === requested.roomId
    && requested.startMs >= booking.startMs && requested.startMs < booking.endMs);
  if (conflict) throw Error("room_unavailable");
  return [...existing, requested];
}
