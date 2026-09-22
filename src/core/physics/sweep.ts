/**
 * Minkowski-expanded swept circle-vs-AABB (PHYS-02 / D-05).
 * Expand AABB by radius, ray-slab the center segment, face or corner normals.
 */

export type SweepHit = {
  hit: boolean;
  t: number;
  nx: number;
  ny: number;
};

/** Module-level scratch for allocation-free CCD (F-56). Mutated in place. */
const _sweepScratch: SweepHit = { hit: false, t: 1, nx: 0, ny: 0 };

function writeMiss(out: SweepHit): void {
  'worklet';
  out.hit = false;
  out.t = 1;
  out.nx = 0;
  out.ny = 0;
}

/**
 * Swept circle vs AABB over displacement (dx, dy).
 * Writes earliest TOI in [0, 1] and separating normal into `out` (F-56).
 */
export function sweepCircleAabbInto(
  out: SweepHit,
  cx: number,
  cy: number,
  radius: number,
  dx: number,
  dy: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): void {
  'worklet';
  // T-02-01: refuse non-finite geometry so NaN cannot poison World
  if (
    !Number.isFinite(cx) ||
    !Number.isFinite(cy) ||
    !Number.isFinite(radius) ||
    !Number.isFinite(dx) ||
    !Number.isFinite(dy) ||
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY) ||
    radius < 0
  ) {
    writeMiss(out);
    return;
  }

  // Inline eps — worklets must not close over module consts (D-15)
  const eps = 1e-8;
  const cornerEps = 1e-6;

  const expMinX = minX - radius;
  const expMinY = minY - radius;
  const expMaxX = maxX + radius;
  const expMaxY = maxY + radius;

  // Already overlapping expanded AABB at t=0 → contact now
  const inside =
    cx >= expMinX &&
    cx <= expMaxX &&
    cy >= expMinY &&
    cy <= expMaxY;

  let tEnter = 0;
  let tExit = 1;
  let hitAxis = 0; // 1 = X, 2 = Y (last axis that raised tEnter)
  let enterSign = 0; // which side of the slab was crossed for the enter plane

  // --- X slabs ---
  if (Math.abs(dx) < eps) {
    if (cx < expMinX || cx > expMaxX) {
      writeMiss(out);
      return;
    }
  } else {
    const invDx = 1 / dx;
    let t1 = (expMinX - cx) * invDx;
    let t2 = (expMaxX - cx) * invDx;
    let signNear = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      signNear = 1;
    } else {
      signNear = -1;
    }
    if (t1 > tEnter) {
      tEnter = t1;
      hitAxis = 1;
      enterSign = signNear;
    }
    if (t2 < tExit) {
      tExit = t2;
    }
    if (tEnter > tExit) {
      writeMiss(out);
      return;
    }
  }

  // --- Y slabs ---
  if (Math.abs(dy) < eps) {
    if (cy < expMinY || cy > expMaxY) {
      writeMiss(out);
      return;
    }
  } else {
    const invDy = 1 / dy;
    let t1 = (expMinY - cy) * invDy;
    let t2 = (expMaxY - cy) * invDy;
    let signNear = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      signNear = 1;
    } else {
      signNear = -1;
    }
    if (t1 > tEnter) {
      tEnter = t1;
      hitAxis = 2;
      enterSign = signNear;
    }
    if (t2 < tExit) {
      tExit = t2;
    }
    if (tEnter > tExit) {
      writeMiss(out);
      return;
    }
  }

  // Segment is [0,1]; miss if enter is past the segment or exit before start
  if (tExit < 0 || tEnter > 1) {
    writeMiss(out);
    return;
  }

  // If starting outside, tEnter is the impact; if starting inside, t=0
  let t = inside ? 0 : tEnter;
  if (t < 0) {
    // Entered before segment start but still overlapping during [0,1]
    if (tExit < 0) {
      writeMiss(out);
      return;
    }
    // Grazing / started mid-overlap treated as t=0
    t = 0;
  }
  if (t > 1) {
    writeMiss(out);
    return;
  }

  const hx = cx + dx * t;
  const hy = cy + dy * t;

  // Closest point on original AABB → radial normal (faces + corners)
  let closestX = hx;
  if (closestX < minX) closestX = minX;
  else if (closestX > maxX) closestX = maxX;
  let closestY = hy;
  if (closestY < minY) closestY = minY;
  else if (closestY > maxY) closestY = maxY;

  let nx = hx - closestX;
  let ny = hy - closestY;
  const lenSq = nx * nx + ny * ny;

  if (lenSq > cornerEps * cornerEps) {
    const invLen = 1 / Math.sqrt(lenSq);
    nx *= invLen;
    ny *= invLen;
  } else {
    // Center projects inside AABB (deep overlap or exact face via slab) —
    // fall back to the enter-face normal from the slab test.
    if (inside && hitAxis === 0) {
      // Stationary / fully inside with no enter axis: push from nearest face
      const dl = hx - minX;
      const dr = maxX - hx;
      const dt = hy - minY;
      const db = maxY - hy;
      let best = dl;
      nx = -1;
      ny = 0;
      if (dr < best) {
        best = dr;
        nx = 1;
        ny = 0;
      }
      if (dt < best) {
        best = dt;
        nx = 0;
        ny = -1;
      }
      if (db < best) {
        nx = 0;
        ny = 1;
      }
    } else if (hitAxis === 1) {
      nx = enterSign;
      ny = 0;
    } else if (hitAxis === 2) {
      nx = 0;
      ny = enterSign;
    } else {
      // Degenerate zero displacement while touching — prefer outward from center
      const midX = (minX + maxX) * 0.5;
      const midY = (minY + maxY) * 0.5;
      nx = hx < midX ? -1 : 1;
      ny = 0;
      if (Math.abs(hy - midY) > Math.abs(hx - midX)) {
        nx = 0;
        ny = hy < midY ? -1 : 1;
      }
    }
  }

  // Reject contacts where displacement already separates (dot(d, n) ≥ 0),
  // including overlaps. Reporting an inside/separating hit caused stepWorld to
  // reflect and flip velocity back into the surface (ball freeze between tight
  // brick rows). Positional overlap is handled by depenetration; CCD must only
  // resolve approaching contacts.
  const sep = dx * nx + dy * ny;
  if (sep >= -eps) {
    writeMiss(out);
    return;
  }

  out.hit = true;
  out.t = t;
  out.nx = nx;
  out.ny = ny;
}

/**
 * Thin wrapper: writes into module scratch and returns it (tests / non-hot paths).
 * Hot path (`stepWorld`) must call `sweepCircleAabbInto` with a reused out object.
 */
export function sweepCircleAabb(
  cx: number,
  cy: number,
  radius: number,
  dx: number,
  dy: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): SweepHit {
  'worklet';
  sweepCircleAabbInto(
    _sweepScratch,
    cx,
    cy,
    radius,
    dx,
    dy,
    minX,
    minY,
    maxX,
    maxY,
  );
  return _sweepScratch;
}
