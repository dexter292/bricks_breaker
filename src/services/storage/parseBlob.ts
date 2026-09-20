/**
 * Fail-soft parse of AsyncStorage personal-best JSON → floor best or 0 (T-06-01).
 */
export function parsePersonalBestBlob(raw: string | null): number {
  if (raw == null) return 0;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed == null || typeof parsed !== 'object') return 0;
    const blob = parsed as { v?: unknown; bestScore?: unknown };
    if (blob.v !== 1 || typeof blob.bestScore !== 'number') return 0;
    if (!Number.isFinite(blob.bestScore) || blob.bestScore < 0) return 0;
    return Math.floor(blob.bestScore);
  } catch {
    return 0;
  }
}
