/**
 * Preallocated frame metrics for the UI-runtime hot path (D-08).
 * No React imports — mutated only from worklets.
 *
 * Numeric defaults are literals inside worklets (not imported consts):
 * Reanimated/worklets cannot resolve cross-module binding in default params.
 */
export type SpikeMetrics = {
  intervals: Float32Array;
  window: number;
  count: number;
  index: number;
  sampleCount: number;
  lastMs: number;
  lastSubsteps: number;
  maxSubsteps: number;
  overBudget: number;
  rollingFps: number;
  p95Ms: number;
  p99Ms: number;
  spriteCount: number;
  /** Tick captured when self-check window starts. */
  startTick: number;
  lastTick: number;
  /** True once tick advanced across SELF_CHECK_FRAMES. */
  workletPass: boolean;
  selfCheckReady: boolean;
  /** Scratch buffer for percentile sort (no per-frame alloc). */
  scratch: Float32Array;
};

export function createMetrics(windowSize?: number): SpikeMetrics {
  'worklet';
  // Literals only — worklets cannot close over module const bindings reliably.
  const window = windowSize ?? 60; // METRICS_WINDOW
  return {
    intervals: new Float32Array(window),
    window,
    count: 0,
    index: 0,
    sampleCount: 0,
    lastMs: 0,
    lastSubsteps: 0,
    maxSubsteps: 0,
    overBudget: 0,
    rollingFps: 0,
    p95Ms: 0,
    p99Ms: 0,
    spriteCount: 0,
    startTick: -1,
    lastTick: 0,
    workletPass: false,
    selfCheckReady: false,
    scratch: new Float32Array(window),
  };
}

/** Mean interval over filled samples (ms). */
export function meanInterval(m: SpikeMetrics): number {
  'worklet';
  const n = m.count;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += m.intervals[i];
  }
  return sum / n;
}

/** Rolling FPS = 1000 / mean(interval) — not mean of per-frame FPS. */
export function rollingFps(m: SpikeMetrics): number {
  'worklet';
  const mean = meanInterval(m);
  if (mean <= 0) return 0;
  return 1000 / mean;
}

function percentileMs(m: SpikeMetrics, p: number): number {
  'worklet';
  const n = m.count;
  if (n === 0) return 0;
  const scratch = m.scratch;
  for (let i = 0; i < n; i++) {
    scratch[i] = m.intervals[i];
  }
  // Insertion sort — N≤60, no allocation.
  for (let i = 1; i < n; i++) {
    const key = scratch[i];
    let j = i - 1;
    while (j >= 0 && scratch[j] > key) {
      scratch[j + 1] = scratch[j];
      j--;
    }
    scratch[j + 1] = key;
  }
  const rank = Math.min(n - 1, Math.max(0, Math.ceil((p / 100) * n) - 1));
  return scratch[rank];
}

export function pushSample(
  m: SpikeMetrics,
  intervalMs: number,
  substeps: number,
  spriteCount: number,
  tick: number,
  selfCheckFrames: number,
  /** F-29: skip percentile sort when overlay is off (production). */
  computePercentiles: boolean = true,
): void {
  'worklet';
  m.intervals[m.index] = intervalMs;
  m.index = (m.index + 1) % m.window;
  if (m.count < m.window) m.count += 1;
  m.sampleCount += 1;
  m.lastMs = intervalMs;
  m.lastSubsteps = substeps;
  if (substeps > m.maxSubsteps) m.maxSubsteps = substeps;
  if (intervalMs > 16.7) m.overBudget += 1; // BUDGET_MS
  m.spriteCount = spriteCount;
  m.lastTick = tick;
  m.rollingFps = rollingFps(m);
  if (computePercentiles) {
    m.p95Ms = percentileMs(m, 95);
    m.p99Ms = percentileMs(m, 99);
  }

  if (m.startTick < 0) {
    m.startTick = tick;
  }
  if (!m.selfCheckReady && m.sampleCount >= selfCheckFrames) {
    m.selfCheckReady = true;
    m.workletPass = tick > m.startTick;
  }
}
