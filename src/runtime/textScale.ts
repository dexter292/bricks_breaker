/**
 * The Dynamic Type ceiling for every `Text` node in the app (N-UI-02, 14-04). Discharges
 * D-18 and `WINDOWS.md` #29.
 *
 * ## The defect #29 records
 *
 * `allowFontScaling` defaults to `true` on every `Text` node
 * (`Libraries/Text/Text.js:289`), and an explicit `lineHeight` ALSO scales
 * (`RCTAttributedTextUtils.mm:230`). Nothing in this app set a ceiling before this plan, so
 * the binding surface — the shipped `ResultOverlay` campaign-win panel, not any screen
 * this phase adds — clips one Dynamic Type step above the system default.
 *
 * ## The measurement
 *
 * Measured by pixel analysis on an iPhone SE (3rd generation): 568pt tall, a MEASURED top
 * inset of 20pt and a MEASURED bottom inset of 0pt, giving 548pt usable. The campaign-win
 * panel's layout is 228pt FIXED (padding, borders, button chrome — none of it scales) plus
 * 256pt of SCALING text across seven rows, for 484pt at nominal (1.0×) text size.
 *
 * **The panel HEIGHT ratio at `extra-large` is 1.0553, and that is NOT the text
 * multiplier.** This is the trap #29 names: fixed chrome dilutes the ratio, so a spec that
 * quoted the panel's own growth would understate how fast the TEXT is actually growing.
 * Every projection below uses absolute per-row growth instead. The #29 reading measured
 * +20.0pt across the seven scaling rows at `extra-large`, which calibrates the growth
 * coefficient at 1.0593 — not assumed to be 1.
 *
 * Projected ceiling: the panel clips (228 + 256×k > 548) once k exceeds (548 − 228) / 256 =
 * **1.236**. At k = 1.236 the panel is exactly 548.2pt against 548pt usable — the own
 * ceiling of this binding surface.
 *
 * ## Why 1.2
 *
 * - iOS `xLarge`, the most common accessibility step up from the default, is ≈1.118×. A cap
 *   at or above this means the step nearly everyone who adjusts text size actually uses
 *   renders at FULL requested size — nobody common is scaled down.
 * - 1.2 sits 0.036 below the measured 1.236 ceiling, so the binding panel still fits at the
 *   cap: 228 + 256×1.2 = 535.2pt against 548pt usable (538.2pt is this file's own 12-04
 *   measurement at the two overlays' combined node count; both numbers describe the same
 *   margin).
 * - **It survives a pessimistic recalibration.** The measured growth coefficient is 1.0593
 *   — i.e. text grows 5.93% faster per nominal unit than a naive reading would assume. Even
 *   if a later remeasurement revises that coefficient upward, 1.2 still leaves the panel
 *   clipping only once growth runs roughly 25% above nominal, which is a wide margin against
 *   a measured 5.93%.
 *
 * **Rejected values, recorded so a later author does not re-litigate them:**
 * - `1.118` (snap to the `xLarge` step exactly): buys 22pt more headroom on the binding
 *   surface than 1.2 does, but snapping the cap to a named OS step couples this constant to
 *   a value Apple can redefine; a plain decimal above the step does not.
 * - `1.236` (the ceiling itself): zero margin — any remeasurement error or a second
 *   overlay-stack divergence clips the panel immediately.
 * - Unbounded (today's behaviour, pre-14-04): the defect `#29` exists to record.
 *
 * ## Two prop-surface facts the UI-SPEC does not record
 *
 * - A `maxFontSizeMultiplier` below 1.0 is silently ignored, and `0` means "no max" —
 *   `Libraries/Text/TextProps.js:165-180`. `MAX_FONT_SCALE` must stay >= 1.0 and non-zero or
 *   the prop becomes a no-op rather than a cap.
 * - The prop is applied as a continuous `fminf` clamp, not a snap to an iOS step
 *   (`RCTAttributedTextUtils.mm:117`), and it INHERITS to nested `Text` nodes. A nested
 *   `Text` carrying the prop explicitly is not redundant with an ancestor's — React Native
 *   does not document inheritance as authoritative across arbitrary nesting, and every
 *   count-equality gate in this phase therefore counts EVERY node, not just top-level ones.
 *
 * ## Scope — twelve production files read this constant
 *
 * Seven in `src/runtime` (this plan, 14-04): `overlays/ResultOverlay.tsx`,
 * `overlays/DailyResultOverlay.tsx`, `overlays/PauseOverlay.tsx`,
 * `overlays/CountdownOverlay.tsx`, `overlays/LevelErrorOverlay.tsx`, `HudStrip.tsx`,
 * `GameScreen.tsx`. Five in `app/_components` (14-07): `TitleScreen.tsx`,
 * `SelectScreen.tsx`, `StatisticsScreen.tsx`, `AchievementsScreen.tsx`, `GameHost.tsx` (if
 * it renders `Text` directly). `SelectScreen` is in scope even though its OWN ceiling is
 * ≈1.94 — if Title caps and `SelectScreen` does not, one tap changes the player's effective
 * text size mid-session. The cap is a property of the app's typography, not a per-screen
 * repair. The Skia playfield renders no `Text` and is untouched by this constant.
 *
 * `src/runtime/textScale.ts` is deliberately a leaf: zero imports, no React, one export —
 * the `src/runtime/constants.ts` shape — so `runtime -> runtime` is the only dependency this
 * file introduces, permitted by `eslint.config.js` `boundaries/dependencies`. `lint` is the
 * only mechanism that observes that policy; no unit test covers it.
 */
export const MAX_FONT_SCALE = 1.2;
