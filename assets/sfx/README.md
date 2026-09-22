# SFX provenance — Neon Brick Breaker

Seven short WAV cues used by the MVP audio service.

| File | Role | Duration (approx) |
|------|------|-------------------|
| `paddle_hit.wav` | Paddle contact | 60 ms |
| `brick_chip.wav` | Brick damaged (not destroyed) | 50 ms |
| `brick_break.wav` | Brick destroyed | 90 ms |
| `powerup_catch.wav` | Power-up collected | 80 ms |
| `life_lost.wav` | Life lost / ball out | 120 ms |
| `win.wav` | Level clear | 150 ms |
| `lose.wav` | Game over | 180 ms |

## Provenance (closed for store submit — 2026-09-22)

| Field | Value |
|-------|--------|
| **Author** | Project-authored for Neon Brick Breaker (this repository) |
| **Format** | RIFF WAVE, Microsoft PCM, **16-bit mono, 22050 Hz**, no embedded metadata / INFO chunk |
| **Tool chain** | Generated as short PCM cues for this app (export/resample to 22.05 kHz mono Int16). No third-party SFX pack imported into `assets/sfx/`. |
| **License** | **All rights reserved** — owned by the app publisher for distribution **only as bundled assets** in Neon Brick Breaker. Not licensed for redistribution as a standalone pack. |
| **SPDX** | `LicenseRef-Proprietary-AppBundle` (in-repo label; not an OSI license) |
| **Date** | Files dated 2026-09-20 in tree; provenance closed 2026-09-22 |

Do **not** claim Creative Commons, royalty-free marketplace, or third-party pack licensing — none apply.
