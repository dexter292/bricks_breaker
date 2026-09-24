/**
 * CERT metrics publish (R-20 / LC-07).
 * Mutates the stable mirror in place; returns whether certSeq should bump.
 * Worklet-safe — zero allocation beyond the existing SharedValue object.
 */
export type CertMetricsMirror = {
  p50: number;
  p95: number;
  mean: number;
  fps: number;
  n: number;
  over: number;
};

export function createCertMetricsMirror(): CertMetricsMirror {
  return { p50: 0, p95: 0, mean: 0, fps: 0, n: 0, over: 0 };
}

/**
 * Copy sample fields into `mirror`. Always marks dirty when called — callers
 * gate on sample cadence (~1 Hz) before invoking.
 * @returns 1 (caller bumps certSeq)
 */
export function publishCertMetricsMirror(
  mirror: CertMetricsMirror,
  p50: number,
  p95: number,
  mean: number,
  fps: number,
  n: number,
  over: number,
): number {
  'worklet';
  mirror.p50 = p50;
  mirror.p95 = p95;
  mirror.mean = mean;
  mirror.fps = fps;
  mirror.n = n;
  mirror.over = over;
  return 1;
}
