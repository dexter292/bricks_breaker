/** SoA stub world for the Phase-1 thread-boundary spike (no physics). */
export type SpikeWorld = {
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  w: Float32Array;
  h: Float32Array;
  color: Uint32Array;
  spriteCount: number;
  accumulator: number;
  tick: number;
};
