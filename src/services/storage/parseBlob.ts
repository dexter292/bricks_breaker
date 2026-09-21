/**
 * Fail-soft parse of AsyncStorage personal-best JSON (T-06-01 / F-26).
 * Distinguishes absent vs corrupt so callers never treat garbage as best=0.
 */

export type ParseBestResult =
  | { status: 'ok'; best: number }
  | { status: 'absent'; best: 0 }
  | { status: 'corrupt'; best: 0 };

export function parsePersonalBestResult(
  raw: string | null,
): ParseBestResult {
  if (raw == null) {
    return { status: 'absent', best: 0 };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed == null || typeof parsed !== 'object') {
      return { status: 'corrupt', best: 0 };
    }
    const blob = parsed as { v?: unknown; bestScore?: unknown };
    if (blob.v !== 1 || typeof blob.bestScore !== 'number') {
      return { status: 'corrupt', best: 0 };
    }
    if (!Number.isFinite(blob.bestScore) || blob.bestScore < 0) {
      return { status: 'corrupt', best: 0 };
    }
    return { status: 'ok', best: Math.floor(blob.bestScore) };
  } catch {
    return { status: 'corrupt', best: 0 };
  }
}

/**
 * Legacy helper — absent → 0; corrupt → 0.
 * Prefer parsePersonalBestResult when refusing to clobber a known best (F-26).
 */
export function parsePersonalBestBlob(raw: string | null): number {
  return parsePersonalBestResult(raw).best;
}
