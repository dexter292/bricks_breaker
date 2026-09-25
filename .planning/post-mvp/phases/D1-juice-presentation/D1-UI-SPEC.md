---
phase: D1
slug: juice-presentation
status: approved
created: 2026-09-25
reviewed_at: 2026-09-25
---

# Phase D1 — UI-SPEC (thin)

> **No new React screens.** D1 juice is Skia/VFX + native haptics. Shell / Results chrome unchanged from C2 (CONTEXT D-06/D-07).

## Scope

| In | Out |
|----|-----|
| Brick destroy scale/fade (draw params / ghost quads) | New Select/Title layouts |
| Paddle hit squash (draw scale only) | Timed shell transitions |
| Haptics (device, not visual) | Confetti, Results star animation, delayed overlay |
| | Parallax / scanlines / heavier glow |

## Copy

No new user-facing strings required. Results copy = Claude’s Discretion only if touched — prefer leave C2 copy.

## Color / type / spacing

Inherit Phase 7 / C2 navy + SpaceMono. Ball remains `#FFFFFF` last in draw order. Fade must not raise particle count or add full-screen layers (Mid freeze).

## Motion (VFX)

| Effect | Spec |
|--------|------|
| Brick break | Short scale-down + alpha fade on break geom; cascade applies to each broken brick; ≤ ~150–250 ms (Discretion) |
| Paddle squash | Brief Y or uniform scale on hit; restore; never change `paddleW` |
| Shell / Results | Instant as today; CERT/SOAK no delay |

## A11y

- Haptics: OS System Haptics suppresses; do not AND with reduce-motion visual intensity
- Reduce-motion continues to scale **visual** VFX only via `useVfxIntensity`

## Registry

None (no shadcn / no web design system).

## Ready for planning

Yes — contract is “no new UI surface + VFX constraints above.”
