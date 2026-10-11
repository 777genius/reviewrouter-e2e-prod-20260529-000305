// Disposable review fixture, not a production food-safety policy.
// Contract: readings exactly at maximumCelsius are safe. Only strictly higher
// readings contribute exposure; a safe bucket resets continuous exposure.
export type TemperatureBucket = Readonly<{
  durationMinutes: number;
  celsius: number;
}>;

export type ColdChainLimits = Readonly<{
  maximumCelsius: number;
  maximumExposureMinutes: number;
  maximumContinuousMinutes: number;
}>;

export type ColdChainResult = Readonly<{
  exposureMinutes: number;
  longestContinuousMinutes: number;
  acceptable: boolean;
}>;

function requirePositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(name + ' must be a positive integer');
  }
}

function requireFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(name + ' must be finite');
  }
}

export function assessColdChain(
  buckets: readonly TemperatureBucket[],
  limits: ColdChainLimits,
): ColdChainResult {
  if (buckets.length === 0) {
    throw new RangeError('buckets must not be empty');
  }

  requireFinite(limits.maximumCelsius, 'maximumCelsius');
  requirePositiveInteger(limits.maximumExposureMinutes, 'maximumExposureMinutes');
  requirePositiveInteger(limits.maximumContinuousMinutes, 'maximumContinuousMinutes');

  let exposureMinutes = 0;
  let continuousMinutes = 0;
  let longestContinuousMinutes = 0;

  for (const bucket of buckets) {
    requirePositiveInteger(bucket.durationMinutes, 'durationMinutes');
    requireFinite(bucket.celsius, 'celsius');

    const isExcursion = bucket.celsius >= limits.maximumCelsius;

    if (isExcursion) {
      exposureMinutes += bucket.durationMinutes;
      continuousMinutes += bucket.durationMinutes;
      longestContinuousMinutes = Math.max(
        longestContinuousMinutes,
        continuousMinutes,
      );
    } else {
      continuousMinutes = 0;
    }
  }

  return {
    exposureMinutes,
    longestContinuousMinutes,
    acceptable:
      exposureMinutes <= limits.maximumExposureMinutes &&
      longestContinuousMinutes <= limits.maximumContinuousMinutes,
  };
}
