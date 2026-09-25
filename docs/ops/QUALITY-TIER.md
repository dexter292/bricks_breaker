# Quality tiers (N-TIER-01 / R-12)

**Status:** Documented — **owner pick pending** (mitigation not chosen)  
**Date:** 2026-09-24  
**Code:** `src/runtime/resolveQualityTier.ts`  
**Tests:** `tests/runtime.quality-tiers.test.ts`  
**Wire-up:** `app/_components/PlayingHost.tsx` (once per mount via `readDeviceMemory` + `resolveQualityTier`)

## How tiers are chosen

Resolution order in `resolveQualityTier`:

1. **DEV override** (`override: 'low' | 'mid' | 'high'`) — wins if set; production omits.
2. **Pixel 6a model force Mid** — if `modelName` matches `/Pixel 6a/i` → always `'mid'` (D-13; historical Android cert reference; dead under D2=B iOS-first but still coded).
3. **RAM heuristic** via `tierFromMemory(totalMemory)` from `expo-device` (`Device.totalMemory`).
4. **Unknown / soft-fail → Mid** — null, NaN, ≤0 memory, or `readDeviceMemory` catch → `'mid'` (keeps glow on).

### RAM thresholds (as coded)

| Total RAM | Tier |
|-----------|------|
| Unavailable / invalid | → resolve defaults to **Mid** |
| `< 4 GB` | **Low** |
| `≥ 4 GB` and `< 8 GB` | **Mid** (includes exactly 4 GB and ~6 GB Pixel 6a band) |
| `≥ 8 GB` | **High** |

`totalMemory` is compared in bytes (`GB = 1024³`). Boundary: `4 * GB` is Mid, not Low (`< 4 * GB` only).

### VFX budgets (unchanged — document only)

| Tier | `particleCap` | `trailMax` | `glowScale` |
|------|---------------|------------|-------------|
| Low | 48 | 2 | 0 (skip glow blit) |
| Mid | 128 | 4 | 1 |
| High | 192 | 5 | 1 |

Mid was the Pixel 6a / Cert WC baseline. High is capped below particle pool hard max. Low is the only tier that disables glow.

### Mid freeze (D1 / D-01)

D1 juice **must not** raise Mid budgets: `particleCap` **128**, `glowScale` **1**, existing shake caps. No confetti / new particles, no extra full-screen Skia layers, no heavier glow. Brick **ghost** quads are draw-only flat fills — they are **not** counted against the particle budget (`ghost` pool ≠ `particleCap`). Paddle squash is draw-quad scale only. Haptics are non-render and do not change Mid budgets.

**§6 / Cert:** Mid freeze does **not** mean “skip Cert.” Ghosts still add transient draw quads (cap 16, ~150 ms) after breaks — that **is** a render-load delta. Post-D1 Instruments Cert WC is **required** (`docs/ops/CEILING-CERT.md` §5c note).

## Which devices get Mid vs Low (as coded)

**Low:** devices reporting strictly under 4 GB total RAM (rare on modern iPhones).

**Mid:** every device with **4 GB ≤ RAM < 8 GB**, plus unknown memory, plus Pixel 6a by model name. That includes typical mid-tier iPhones with **4 GB** (e.g. iPhone 11 / SE 3 class) — they receive Mid budgets (128 particles, trails 4, glow on).

**High:** devices reporting ≥ 8 GB (e.g. iPhone 16 Pro class).

GPU / SoC generation is **not** an input. Only RAM (+ DEV override + Pixel 6a name).

## Risk (R-12)

Ceiling cert protocol forces **Mid** Cert WC on **iPhone 16 Pro (A18 Pro)** — see `docs/measurement-methodology.md`. That proves Mid *budgets* on a strong GPU, not Mid budgets on weaker 4 GB phones that the RAM heuristic also maps to Mid.

Marketing or release claims that imply “Mid = certified everywhere Mid is assigned” would overstate evidence. Floor cert on a named mid-tier 60 Hz device (R-10 / N-PLT-02) is still **NOT RUN**.

## Mitigation options (list only — do not implement here)

Owner should pick one (or a combination) before **G2 marketing honesty**:

1. **Force Low on `< X GB`** — e.g. treat `< 6 GB` or exact 4 GB band as Low until floor hardware proves Mid.
2. **SoC / model heuristic** — gate Mid on chip generation (A13–A15 vs A18), not RAM alone.
3. **Rename marketing** — stop implying Mid = “certified mid-tier phone”; say “Mid budget / Cert WC scene” only.
4. **Floor cert first** — run N-PLT-02 floor on a named 4 GB / A13–A15 device under Mid; keep resolver if PASS.
5. **Conservative unknown** — change null-memory default from Mid → Low (behavior change; needs product sign-off).
6. **Ship with signed residual risk** — keep code; record owner acceptance in RELEASE-GATES / ledger that 4 GB Mid is unproven.

**Agent recommendation (2026-09-24, not a lock):** prefer **#3 + #6** until R-10 floor hardware exists — no code change, honest store/marketing wording, residual risk signed. Pick **#1** (4 GB → Low) only if you want a safer default before any floor device arrives.

## Status

| ID | State |
|----|--------|
| **N-TIER-01** | **Documented (owner pick pending)** |
| **R-12** | Still **OPEN** until a mitigation above is chosen and (if code) shipped |

Documentation alone does not close the product risk — it makes the heuristic and gap explicit for the owner.
