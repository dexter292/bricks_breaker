/**
 * Velocity resolve: wall/brick reflect + classic Breakout paddle english (PHYS-04).
 * Coordinate system: y increases downward; post-paddle bounce has vy < 0 (up).
 * Worklet bodies inline literals matching constants.ts — do not close over module consts.
 */

export type Velocity2 = { vx: number; vy: number };

/** Module-level scratch for allocation-free collision resolve (F-56). */
const _velScratch: Velocity2 = { vx: 0, vy: 0 };

/**
 * Reflect velocity about a (preferably unit) normal; preserve speed.
 * Writes result into `out` (F-56). Non-finite inputs → prior velocity unchanged (T-02-01).
 */
export function reflectVelocityInto(
  out: Velocity2,
  vx: number,
  vy: number,
  nx: number,
  ny: number,
): void {
  'worklet';
  if (
    !Number.isFinite(vx) ||
    !Number.isFinite(vy) ||
    !Number.isFinite(nx) ||
    !Number.isFinite(ny)
  ) {
    out.vx = vx;
    out.vy = vy;
    return;
  }

  const nLen = Math.hypot(nx, ny);
  if (!(nLen > 0)) {
    out.vx = vx;
    out.vy = vy;
    return;
  }
  const unx = nx / nLen;
  const uny = ny / nLen;

  const speed0 = Math.hypot(vx, vy);
  const incomingDot = vx * unx + vy * uny;
  let ovx = vx - 2 * incomingDot * unx;
  let ovy = vy - 2 * incomingDot * uny;

  // Only when the inbound path was approaching: if float error leaves us still
  // approaching after reflect, nudge outward. Do not touch non-approaching inputs
  // (those are not real contacts — nudging would distort a pure reflect).
  let dot = ovx * unx + ovy * uny;
  if (incomingDot < 0 && dot < 0) {
    // Separation eps must match SEPARATION_EPS (1e-4) in constants.ts.
    const nudge = 1e-4;
    ovx = ovx + unx * nudge;
    ovy = ovy + uny * nudge;
  }

  const speed1 = Math.hypot(ovx, ovy);
  if (speed1 > 0 && speed0 > 0) {
    const scale = speed0 / speed1;
    ovx *= scale;
    ovy *= scale;
  }

  out.vx = ovx;
  out.vy = ovy;
}

/**
 * Enforce |vy|/speed >= cos(62°) while preserving speed and vertical sign (F-22).
 * Writes result into `out` (F-56).
 */
export function enforceMinVerticalRatioInto(
  out: Velocity2,
  vx: number,
  vy: number,
): void {
  'worklet';
  if (!Number.isFinite(vx) || !Number.isFinite(vy)) {
    out.vx = vx;
    out.vy = vy;
    return;
  }
  const speed = Math.hypot(vx, vy);
  if (!(speed > 0)) {
    out.vx = vx;
    out.vy = vy;
    return;
  }
  // Literals must match constants.ts (PADDLE_ANGLE_CLAMP_DEG = 62).
  const clampRad = (62 * Math.PI) / 180;
  const minVert = Math.cos(clampRad);
  const absVyRatio = Math.abs(vy) / speed;
  if (absVyRatio >= minVert) {
    out.vx = vx;
    out.vy = vy;
    return;
  }
  const headingSign = vx >= 0 ? 1 : -1;
  const angle = headingSign * clampRad;
  let ovx = Math.sin(angle) * speed;
  // Preserve travel direction along Y (up = negative in y-down coords)
  let ovy = vy >= 0 ? Math.cos(angle) * speed : -Math.cos(angle) * speed;
  out.vx = ovx;
  out.vy = ovy;
}

/**
 * Enforce |vx|/speed >= sin(8°) while preserving speed and vertical sign (PHYS-04 / NF-2).
 * `headingSign`: when vx≈0, prefer paddle t sign, else prior vx sign, else +1.
 * Writes result into `out` (F-56).
 */
export function enforceMinHorizontalRatioInto(
  out: Velocity2,
  vx: number,
  vy: number,
  headingSign?: number,
): void {
  'worklet';
  if (!Number.isFinite(vx) || !Number.isFinite(vy)) {
    out.vx = vx;
    out.vy = vy;
    return;
  }
  const speed = Math.hypot(vx, vy);
  if (!(speed > 0)) {
    out.vx = vx;
    out.vy = vy;
    return;
  }
  // Literals must match constants.ts (STALL_ANGLE_NUDGE_DEG = 8).
  const minHoriz = Math.sin((8 * Math.PI) / 180);
  const absVxRatio = Math.abs(vx) / speed;
  if (absVxRatio >= minHoriz) {
    out.vx = vx;
    out.vy = vy;
    return;
  }
  let sign = 1;
  if (headingSign !== undefined && headingSign !== 0) {
    sign = headingSign > 0 ? 1 : -1;
  } else if (vx !== 0) {
    sign = vx > 0 ? 1 : -1;
  }
  const newVx = sign * minHoriz * speed;
  const vySign = vy >= 0 ? 1 : -1;
  const vySq = speed * speed - newVx * newVx;
  const newVy = vySign * Math.sqrt(vySq > 0 ? vySq : 0);
  out.vx = newVx;
  out.vy = newVy;
}

/**
 * Classic Breakout paddle english (D-01…D-03 / NG-1).
 * Writes result into `out` (F-56).
 * t = clamp((ballX - paddleCx) / paddleHalfW, -1, 1)
 * angleFromUp = sign(t) * (8° + |t| * 54°)  // monotonic band [8°, 62°]
 * vx = sin(angle)*speed; vy = -cos(angle)*speed  // y-down → up is −vy
 */
export function resolvePaddleEnglishInto(
  out: Velocity2,
  ballX: number,
  paddleCx: number,
  paddleHalfW: number,
  vx: number,
  vy: number,
): void {
  'worklet';
  if (
    !Number.isFinite(ballX) ||
    !Number.isFinite(paddleCx) ||
    !Number.isFinite(paddleHalfW) ||
    !Number.isFinite(vx) ||
    !Number.isFinite(vy)
  ) {
    out.vx = vx;
    out.vy = vy;
    return;
  }

  const speed = Math.hypot(vx, vy);
  if (!(speed > 0) || !(paddleHalfW > 0)) {
    out.vx = vx;
    out.vy = vy;
    return;
  }

  // Literals must match constants.ts (PADDLE_ANGLE_CLAMP_DEG = 62, STALL_ANGLE_NUDGE_DEG = 8).
  const clampRad = (62 * Math.PI) / 180;
  const minHorizRad = (8 * Math.PI) / 180;
  const spanRad = clampRad - minHorizRad;

  let t = (ballX - paddleCx) / paddleHalfW;
  if (t < -1) t = -1;
  else if (t > 1) t = 1;

  let sign = 1;
  if (t > 0) {
    sign = 1;
  } else if (t < 0) {
    sign = -1;
  } else if (vx !== 0) {
    sign = vx > 0 ? 1 : -1;
  }

  const angle = sign * (minHorizRad + Math.abs(t) * spanRad);
  const ovx = Math.sin(angle) * speed;
  const ovy = -Math.cos(angle) * speed;

  out.vx = ovx;
  out.vy = ovy;
}

/** Thin wrapper — returns module scratch (tests / non-hot paths). */
export function reflectVelocity(
  vx: number,
  vy: number,
  nx: number,
  ny: number,
): Velocity2 {
  'worklet';
  reflectVelocityInto(_velScratch, vx, vy, nx, ny);
  return _velScratch;
}

/** Thin wrapper — returns module scratch (tests / non-hot paths). */
export function enforceMinVerticalRatio(vx: number, vy: number): Velocity2 {
  'worklet';
  enforceMinVerticalRatioInto(_velScratch, vx, vy);
  return _velScratch;
}

/** Thin wrapper — returns module scratch (tests / non-hot paths). */
export function enforceMinHorizontalRatio(
  vx: number,
  vy: number,
  headingSign?: number,
): Velocity2 {
  'worklet';
  enforceMinHorizontalRatioInto(_velScratch, vx, vy, headingSign);
  return _velScratch;
}

/** Thin wrapper — returns module scratch (tests / non-hot paths). */
export function resolvePaddleEnglish(
  ballX: number,
  paddleCx: number,
  paddleHalfW: number,
  vx: number,
  vy: number,
): Velocity2 {
  'worklet';
  resolvePaddleEnglishInto(_velScratch, ballX, paddleCx, paddleHalfW, vx, vy);
  return _velScratch;
}
