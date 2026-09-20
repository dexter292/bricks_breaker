# Phase 7: Feedback — Neon VFX & Audio - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-20
**Phase:** 7-feedback-neon-vfx-audio
**Areas discussed:** Neon glow & break spectacle, Ball trail character, Shake & impact punch, SFX personality & mix

---

## Session north star (user)

Shatter-inspired neon sci-fi; impressive brick destruction; readable ball trail; modern arcade SFX. VFX cosmetic only — never compromise ball visibility, paddle responsiveness, or 60 FPS on Pixel 6a. Reduce-motion + adaptive VFX intensity in scope.

---

## Neon glow & break spectacle

| Option | Description | Selected |
|--------|-------------|----------|
| Always-on soft glow (baked) | Soft neon edge/halo via baked/cached rendering | ✓ |
| Dim idle, bright on damage | Quiet field until hit | |
| Glow only on break/chip | Flat until impact | |

**User's choice:** Always-on soft neon edge/halo; baked/cached; no per-brick per-frame blur

| Option | Description | Selected |
|--------|-------------|----------|
| Neon sparks / energy flecks | Bright short burst | ✓ |
| Geometric shards | Tumbling brick fragments | |
| Expanding neon ring + dust | Shockwave then dust | |

**User's choice:** Bright neon sparks / energy flecks — short satisfying burst

| Option | Description | Selected |
|--------|-------------|----------|
| Scaled same language | Chip small / destroy large same FX | ✓ |
| Distinct cues | Chip = crack flash; kill = full burst | |
| You decide | Within chip readable / kill spectacular | |

**User's choice:** Same language at different intensities; destroy adds brief glow flash

| Option | Description | Selected |
|--------|-------------|----------|
| Inherit brick + white/cyan | Brick-tinted sparks + highlights | ✓ |
| Fixed neon accent | Cyan/magenta regardless of brick | |
| Brick core + complementary rim | Extra sci-fi pop | |

**User's choice:** Inherit brick color + white/cyan highlights; budgeted/adaptive; Pixel 6a priority

---

## Ball trail character

| Option | Description | Selected |
|--------|-------------|----------|
| Fading ghost afterimages | Discrete fading silhouettes | ✓ |
| Continuous neon streak / ribbon | Smooth motion-blur path | |
| Hybrid | Short streak + ghost dots | |

**User's choice:** Fading ghost afterimages for high-speed / multi-ball readability

| Option | Description | Selected |
|--------|-------------|----------|
| Short & snappy 3–5 frames | Live ball always distinct | ✓ |
| Medium arcade comet | Longer but clears per bounce | |
| Long Shatter-ish comet | Dramatic; multi-ball clutter risk | |

**User's choice:** 3–5 frame history; current ball always distinguishable

| Option | Description | Selected |
|--------|-------------|----------|
| White/light + cyan rim | Max contrast on navy | ✓ |
| Cyan/magenta neon | Independent of ball fill | |
| Speed-tinted | Cool→hot with speed | |

**User's choice:** White/light + subtle cyan rim

| Option | Description | Selected |
|--------|-------------|----------|
| 1–2 solid afterimages no bloom | High-contrast minimum | ✓ |
| Single elongated highlight | No multi-sample ghosts | |
| You decide | Within readable at max speed | |

**User's choice:** 1–2 high-contrast afterimages, no glow/bloom; never fully disable; bounded per-ball history; no per-frame React state

---

## Shake & impact punch

| Option | Description | Selected |
|--------|-------------|----------|
| Destroy + life lost only | Quiet on ordinary hits / pickups | ✓ |
| Destroy + life lost + power-up catch | Extra arcade feedback | |
| Destroy only | Life lost = SFX/flash only | |

**User's choice:** Brick destruction and life loss only

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle decay | Short small offset | ✓ |
| Noticeable arcade bump | Stronger but clamped | |
| You decide | Felt but not disorienting | |

**User's choice:** Subtle short-lived shake with smooth decay

| Option | Description | Selected |
|--------|-------------|----------|
| Stack with hard cap + decay | Merge overlapping shakes | ✓ |
| Retrigger resets decay | Each destroy restarts envelope | |
| Rate-limit while active | Ignore new triggers while shaking | |

**User's choice:** Merge with hard amplitude cap + deterministic decay

| Option | Description | Selected |
|--------|-------------|----------|
| Scale to ~0 at minimum | Intensity scalar drives shake | ✓ |
| Tiny residual bump | Keep micro-shake at minimum | |
| Binary off on reduce-motion | Shake fully off when flag set | |

**User's choice:** Scale with global intensity → ~0 at minimum; cosmetic camera only; no sim/input changes; no hit-stop

---

## SFX personality & mix

| Option | Description | Selected |
|--------|-------------|----------|
| Modern neon arcade | Clean synth + sci-fi edge | ✓ |
| Classic 8-bit / chiptune | Square-wave nostalgia | |
| Hybrid synth + noise click | Synth body + physical click | |

**User's choice:** Modern neon arcade; original assets only

| Option | Description | Selected |
|--------|-------------|----------|
| Same family louder on break | Soft chip → fuller break + shimmer | ✓ |
| Clearly different samples | Different instruments | |
| You decide | Distinct enough in chaos | |

**User's choice:** Same family; chip softer; destroy fuller + brief shimmer

| Option | Description | Selected |
|--------|-------------|----------|
| Life/win/lose → break → paddle/chip → power-up | Rare events loudest | ✓ |
| Breaks loudest | Destruction focus | |
| Flat-ish mix | Timbre distinguishes | |

**User's choice:** Life lost / Win / Lose → Brick break → Paddle / Chip → Power-up

| Option | Description | Selected |
|--------|-------------|----------|
| Overlap + soft voice limits | Dense but capped | ✓ (with steal-oldest) |
| Steal oldest when full | Category voice reuse | ✓ (explicit note) |
| Throttle drop excess | Cleaner, less satisfying | |

**User's choice:** Pooled playback with per-category limits; at limit reuse oldest voice in category. Modular AudioService; preload/decode; non-blocking. No music, haptics, or full audio settings UI in Phase 7.

---

## Claude's Discretion

Exact numeric budgets (particles, shake amp, voice limits), synth sample packaging, intensity↔reduce-motion numeric mapping within locked bands, and internal `src/` VFX module layout.

## Deferred Ideas

- Haptics (FX-04), combo juice/hit-stop (FX-06), music (AUD-01), full settings UI, device quality tiers + formal FPS cert (Phase 8)
