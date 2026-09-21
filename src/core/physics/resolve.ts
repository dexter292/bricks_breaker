/**
 * Velocity resolve: wall/brick reflect + classic Breakout paddle english (PHYS-04).
 * Coordinate system: y increases downward; post-paddle bounce has vy < 0 (up).
 * Worklet bodies inline literals matching constants.ts — do not close over module consts.
 */

/**
 * Reflect velocity about a (preferably unit) normal; preserve speed.
 * v' = v − 2 · dot(v,n) · n. Non-finite inputs → prior velocity unchanged (T-02-01).
 */
export function reflectVelocity(
  vx: number,
  vy: number,
  nx: number,
  ny: number,
): { vx: number; vy: number } {
  'worklet';
  if (
    !Number.isFinite(vx) ||
    !Number.isFinite(vy) ||
    !Number.isFinite(nx) ||
    !Number.isFinite(ny)
  ) {
    return { vx, vy };
  }

  const nLen = Math.hypot(nx, ny);
  if (!(nLen > 0)) {
    return { vx, vy };
  }
  const unx = nx / nLen;
  const uny = ny / nLen;

  const speed0 = Math.hypot(vx, vy);
  let dot = vx * unx + vy * uny;
  let ovx = vx - 2 * dot * unx;
  let ovy = vy - 2 * dot * uny;

  // If still not separating from the surface (dot ≥ 0 along outward normal), nudge away.
  dot = ovx * unx + ovy * uny;
  if (dot >= 0) {
    // Separation eps must match SEPARATION_EPS (1e-4) in constants.ts.
    const nudge = 1e-4;
    ovx = ovx - unx * nudge;
    ovy = ovy - uny * nudge;
  }

  const speed1 = Math.hypot(ovx, ovy);
  if (speed1 > 0 && speed0 > 0) {
    const scale = speed0 / speed1;
    ovx *= scale;
    ovy *= scale;
  }

  return { vx: ovx, vy: ovy };
}

/**
 * Enforce |vy|/speed >= cos(62°) while preserving speed and vertical sign (F-22).
 * Called after wall/brick reflect so near-horizontal stalls cannot persist 12s.
 */
export function enforceMinVerticalRatio(
  vx: number,
  vy: number,
): { vx: number; vy: number } {
  'worklet';
  if (!Number.isFinite(vx) || !Number.isFinite(vy)) {
    return { vx, vy };
  }
  const speed = Math.hypot(vx, vy);
  if (!(speed > 0)) {
    return { vx, vy };
  }
  // Literals must match constants.ts (PADDLE_ANGLE_CLAMP_DEG = 62).
  const clampRad = (62 * Math.PI) / 180;
  const minVert = Math.cos(clampRad);
  const absVyRatio = Math.abs(vy) / speed;
  if (absVyRatio >= minVert) {
    return { vx, vy };
  }
  const headingSign = vx >= 0 ? 1 : -1;
  const angle = headingSign * clampRad;
  let ovx = Math.sin(angle) * speed;
  // Preserve travel direction along Y (up = negative in y-down coords)
  let ovy = vy >= 0 ? Math.cos(angle) * speed : -Math.cos(angle) * speed;
  return { vx: ovx, vy: ovy };
}

/**
 * Classic Breakout paddle english (D-01…D-03).
 * t = clamp((ballX - paddleCx) / paddleHalfW, -1, 1)
 * angleFromUp = t * PADDLE_ANGLE_CLAMP_RAD
 * vx = sin(angle)*speed; vy = -cos(angle)*speed  // y-down → up is −vy
 */
export function resolvePaddleEnglish(
  ballX: number,
  paddleCx: number,
  paddleHalfW: number,
  vx: number,
  vy: number,
): { vx: number; vy: number } {
  'worklet';
  if (
    !Number.isFinite(ballX) ||
    !Number.isFinite(paddleCx) ||
    !Number.isFinite(paddleHalfW) ||
    !Number.isFinite(vx) ||
    !Number.isFinite(vy)
  ) {
    return { vx, vy };
  }

  const speed = Math.hypot(vx, vy);
  if (!(speed > 0) || !(paddleHalfW > 0)) {
    return { vx, vy };
  }

  // Literals must match constants.ts (PADDLE_ANGLE_CLAMP_DEG = 62).
  const clampRad = (62 * Math.PI) / 180;
  const minVert = Math.cos(clampRad); // MIN_VERTICAL_RATIO

  let t = (ballX - paddleCx) / paddleHalfW;
  if (t < -1) t = -1;
  else if (t > 1) t = 1;

  let angle = t * clampRad;

  let ovx = Math.sin(angle) * speed;
  let ovy = -Math.cos(angle) * speed;

  // Enforce min |vy| / reject near-horizontal by re-clamping angle if needed (D-03).
  const absVyRatio = Math.abs(ovy) / speed;
  if (absVyRatio < minVert) {
    const sign = ovx >= 0 ? 1 : -1;
    angle = sign * clampRad;
    ovx = Math.sin(angle) * speed;
    ovy = -Math.cos(angle) * speed;
  }

  // Ensure upward bounce in y-down coordinates.
  if (ovy > 0) {
    ovy = -ovy;
  }

  return { vx: ovx, vy: ovy };
}
