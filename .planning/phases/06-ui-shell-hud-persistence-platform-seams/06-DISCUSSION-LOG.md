# Phase 6 — Discussion Log

**Date:** 2026-09-20  
**Phase:** UI Shell, HUD, Persistence & Platform Seams

## Gray areas selected

All four: App shell & entry flow; HUD polish; Results & high score; Monetization seams & layout.

## User priorities (opening)

- Complete mobile experience; clear HUD that does not cover play area; fast Retry; offline high score
- Monetization/account seams as internal interfaces only — no visible ads/IAP/login
- Safe area + multi phone sizes iOS/Android
- Neon VFX, audio, new gameplay stay later phases

## Area 1 — App shell

| Question | Options | Selected |
|----------|---------|----------|
| Entry flow | 1 Title→Play / 2 Cold-start level / 3 Minimal title no Best | **1** Title → Play |
| Menu from Pause/Results | A Menu→Title / B No title flow | **A** Menu on Pause & Results |

**Notes:** Personal Best on title; Menu in both Pause and Results.

## Area 2 — HUD

| Question | Options | Selected |
|----------|---------|----------|
| Layout | 1 Top safe-area strip / 2 Corner split / 3 Keep Phase 5 text | **1** Top strip |
| Chrome | C Semi-transparent / D Text only | **C** Semi-transparent |

**Notes:** Compact strip; Score, Combo, Lives, Stall; no obstructing gameplay.

## Area 3 — Results & high score

| Question | Options | Selected |
|----------|---------|----------|
| When update best | 1 End of every run / 2 Win only / 3 Live mid-run | **1** End of every run (Win or Lose) |
| Results content | S Score, B Best, R Retry, M Menu | **SBRM** + New Record badge |
| Best outside results | T on title / N results only | **T** on title |

**Notes:** Async persistence; no blocking gameplay; no per-frame React.

## Area 4 — Seams & layout

| Question | Options | Selected |
|----------|---------|----------|
| Layout | 1 Letterbox + insets / 2 Edge-to-edge playfield / 3 Discretion | **1** Letterbox + HUD/overlays in insets |
| Monetization UI | — | **Locked:** interfaces + no-op only; no visible product UI |

## Deferred

Neon VFX, audio, new gameplay mechanics, real monetization SDKs, store compliance, FPS cert.
