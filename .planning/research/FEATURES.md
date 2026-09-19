# Feature Research

**Domain:** Paddle-and-ball brick breaker (Arkanoid/Breakout lineage) — premium, offline, neon-styled mobile arcade game for iOS + Android
**Researched:** 2026-09-19
**Confidence:** MEDIUM-HIGH (genre design canon and store requirements verified against primary sources; mobile-specific control and retention guidance is well-corroborated but not vendor-official)

## Market Framing (read this before the tables)

The most important finding is a **category mismatch on mobile**. Nearly every game ranking under "brick breaker" on the App Store and Play Store today — Ballistic: Brick Breaker, Brick Out: Shoot the Ball, Brick Breaker: Legend Balls, Bricks Breaker Dash — is an **aim-and-shoot "ballz" game**, not a paddle game. The player drags to aim, fires a volley of balls, and waits a turn while rows descend. There is no paddle, no continuous input, and no reflex skill. (Confidence: HIGH — verified directly from four live store listings.)

Two consequences for this project:

1. **The real-time paddle arcade niche is under-served on mobile.** Your competition for "arcade-punchy paddle game" is largely console/PC (Shatter, BreakQuest, Arkanoid re-releases), not the mobile top charts. Differentiating on *feel* is viable because the incumbents aren't even competing on feel.
2. **Do not import ballz-genre features.** Turn-based aiming, ball-count economies, descending-row pressure, collectible ball skins, and star currencies belong to a different game. They are listed as anti-features below.

The second finding is that the incumbents' one-star reviews cluster on a short list of fixable failures: **collision clipping ("ball clips right through a brick that should have cracked"), inconsistent paddle physics, forced interstitial ads, crashes on resume, and unfair difficulty spikes.** An offline, ad-free, collision-correct, resume-safe game is competing directly against the actual complaints in the market. (Confidence: MEDIUM — user reviews and one review aggregator, not controlled research.)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken. These are ordered roughly by how fast their absence kills a session.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Responsive paddle control** | The single make-or-break of the genre. The canonical design question is: *"When missing the ball, does the player's frustration center on their lack of skill, or do they blame the paddle?"* If they blame the paddle, nothing else matters. | MEDIUM | Use **relative drag**, not absolute finger-follow. Absolute placement teleports the paddle on every re-press and puts the thumb over the action. Relative drag = record touch-down point + paddle x, apply deltas, clamp to arena. Needs a tuned px-per-mm gain and light smoothing (enough to reject thumb jitter, not enough to feel like syrup). Expect to re-tune this dozens of times on hardware. |
| **Non-clipping, deterministic collision** | Tunnelling through a brick at speed is the #1 review complaint in this genre and reads as "the game is broken," not "the game is hard." | HIGH | Requires continuous/swept collision (not discrete overlap tests), plus post-impact positional push-out to stop corner sticking. This is the hardest correctness problem in the project and the primary justification for the custom deterministic engine + unit tests already in PROJECT.md. |
| **Paddle-relative bounce angle control** | Skill expression lives here. Players must be able to *aim* by choosing where on the paddle the ball lands. Without it, the player is a spectator. | LOW-MEDIUM | Standard solution: map contact offset to −1..+1 across the paddle, map that onto a bounded upward angle (e.g. 15°–165°), preserve constant speed magnitude. **Clamp away from near-horizontal and exact-vertical** — both produce degenerate, un-fun trajectories. Nudge dead-center hits off-axis. |
| **Ball launch control (ball starts docked to paddle)** | A life that begins with a random serve is a life the player didn't lose fairly. Also gives a natural, text-free moment to teach the control. | LOW | Ball sticks to paddle on life start; tap or release to launch, launch angle derived from paddle position. Doubles as the onboarding beat. |
| **Ball visibility at speed** | Genre canon lists comet trails and high-contrast balls as *readability* features, not decoration: "make sure your ball is still visible at its maximum speed." | LOW | Your neon trail is load-bearing UX, not just spectacle. Budget it as a table-stakes feature. |
| **Multi-HP / varied brick types** | Uniform one-hit bricks read as a 1976 tech demo. Variation in durability is listed as core to the genre since Arkanoid. | LOW-MEDIUM | MVP set: 1-hit, 2–3-hit (with visible damage states), and at least one unbreakable/structural brick for channeling the ball. Damage state must be readable at a glance — color *and* a non-color cue (cracks, brightness, shape). |
| **Score + combo** | Score is the replay motivator for a single-level product. Without it there is no reason to play the level twice. | LOW | Combo = consecutive brick hits without touching the paddle. Decays/resets on paddle contact. Must be visible and escalating. |
| **Lives + unambiguous win/lose** | Stakes. A game you cannot lose is a screensaver. | LOW | 3 lives is the genre default. The win/lose transition needs its own clear, celebratory/definitive moment — not a silent return to menu. |
| **Basic power-ups (multi-ball, paddle expand)** | Both are archetypal genre power-ups; players actively look for drops. Their absence reads as "unfinished." | MEDIUM | Drops fall from destroyed bricks and must be *caught on the paddle* — this is the interesting part, because it forces a real choice between chasing the ball and chasing the power-up. Don't auto-collect. |
| **Pause + safe resume (incl. OS lifecycle)** | Mobile sessions are interrupted constantly. Losing a run to an incoming call is a review-killing bug; incumbents are actively reviewed down for exactly this. | MEDIUM | Must auto-pause on background/blur/call/notification, not just on the pause button. Must resume without physics catch-up spiral (clamp accumulated time). Resume should give a countdown, not an instant un-freeze. |
| **Instant restart / retry** | Score-chasing requires a sub-second path back into a run. Any menu friction here kills replay. | LOW | "Retry" on the lose screen and in the pause menu. No confirmation dialog. |
| **Anti-stall / last-brick mitigation** | The genre's defining structural flaw: long stretches where the ball ricochets out of reach and the player has zero agency. Shatter's designers named this "the last brick issue" and treated it as the core problem to solve. | MEDIUM | Minimum viable mitigations: angle clamping (above), a stall timer that escalates ball speed or nudges trajectory after N seconds without a brick hit, and level geometry that avoids deep unreachable pockets. See Differentiators for the ambitious version. |
| **Core SFX on every impact** | "Every tap needs a reaction: motion, sound, a state change. Silence reads as 'it did not work.'" Ball/paddle/brick audio is also Priority 1 attention in genre canon. | LOW | Paddle hit, brick hit, brick break, power-up catch, life lost, win, lose. Must be sample-accurate to the collision frame or the game feels laggy even at 60 FPS. |
| **Responsive layout + safe areas** | Notches, dynamic islands, home indicators, and 19.5:9 through 4:3 aspect ratios. A paddle under the home indicator is unplayable. | MEDIUM | Playfield should be a fixed logical aspect ratio letterboxed into the safe area, so physics stays resolution-independent and levels are authored once. |
| **Local high score persistence** | Offline score chase needs a number to beat across sessions. | LOW | Local storage only — no account, no network. Survives app kill. |
| **Stable 60 FPS on mid-range hardware** | Below 60, a reflex game stops being fair. Frame drops during particle bursts are the classic failure. | HIGH | Already a PROJECT.md constraint. Note this is a *feature* from the player's side, not just an NFR: the entire "punchy" 40% of your feel mix is frame-timing. |
| **Store compliance baseline** | Both stores hard-require this even for a zero-data offline game. | LOW | **Verified HIGH:** a public HTTPS privacy policy URL is required by *both* Apple and Google; Google's Data Safety form must be completed even when you collect nothing; age-rating questionnaires must be answered honestly; Apple requires apps without significant account features to work without a login (which you satisfy by having no login at all). Include `PrivacyInfo.xcprivacy` on the iOS side. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable. These should be chosen sparingly — Shatter's team noted that in a tightly scoped game "you have to be absolutely on the money with those core mechanics… you can't rely on other parts of the game to lift the experience."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Neon destruction spectacle (glow, shards, particles, graded shake)** | This is the product's visual identity and the entire 30% spectacle slice of the feel mix. It is also the most screenshot-able asset for store listings. | MEDIUM-HIGH | Skia handles this well, but particle count is the single most likely cause of frame drops. Build it with a **pooled, budgeted emitter** and a global intensity scalar from day one. Genre canon's Game Token Priority is explicit: nothing may visually out-compete the paddle and ball. If a brick explosion hides the ball for even 100ms, the effect is a bug. |
| **Continuous paddle agency (paddle bump, or a Shatter-style pull/push)** | The highest-leverage differentiator available. Shatter is widely credited with "solving the Breakout problem" by letting the paddle influence the ball *continuously* instead of once per volley. It converts dead waiting time into active play and largely dissolves the last-brick problem. | MEDIUM (bump) / HIGH (pull-push) | **Recommend paddle bump for MVP.** A short upward paddle lunge is cheap to implement, gives a wider shot-angle range, adds a satisfying idle fidget while waiting for the ball, and can power-up the ball's speed/damage. Reserve pull/push (with a regenerating energy meter) for v1.x — it needs force-field math, a second input channel, and heavy balancing. |
| **Combo-driven escalating feedback (juice that scales with performance)** | Makes skill *feel* like skill. Ties the spectacle budget to player merit instead of spending it uniformly. | MEDIUM | Graded hit-stop (2–5 frames), rising audio pitch, trail intensity, shake amplitude — all keyed to combo tier. Critically: apply juice only *after* the controls are already fair. Juice layered over mushy controls reads as chaos. |
| **Haptics on impact** | On mobile, haptics carry the "punch" that a phone speaker can't. Cheap, and disproportionately effective for the 40% punchy target. | LOW | Light tick on paddle hit, sharper on break, distinct on life lost. Must respect the OS haptics setting and be toggleable. |
| **Hand-crafted showpiece level with authored escalation phases** | Every competitor ships "thousands of levels" of procedurally similar content and gets reviewed down for uneven difficulty spikes. One level that is *designed* — with a strong initial reveal, multiple opening trajectory choices, a mid-level structural change, and a climax — is a genuinely different pitch. | MEDIUM-HIGH | Genre canon's level quality checklist is the right rubric: initial impact on reveal, multiple initial choices, timely ball return, juicy rewards buried deep in formations, and a carnage moment. Target the stated 2–3 min run. Use plateau (stair-step) difficulty, not a monotonic ramp. |
| **Data-driven level format (JSON/typed schema) shipped from day one** | Developer-facing, but it's the difference between a level editor being a feature and being a rewrite. Also enables authoring the one MVP level by iteration rather than by recompilation. | MEDIUM | Include a `levelType` field and per-brick metadata from the start. Genre canon specifically warns to track game-object usage per level in data, not in filenames. |
| **Motion/intensity accessibility controls** | A neon game with glow, trails, flashes, and shake is exactly the profile that triggers motion sensitivity and photosensitivity. Apple publishes explicit Reduced Motion evaluation criteria; honoring it is both an accessibility win and de-risks review. | LOW-MEDIUM | Do **not** ship a binary on/off that flattens the game — the recommended pattern is a *dampened* scale (e.g. keep ~20% intensity) so hits still register. Read the OS reduce-motion flag as the default, expose a manual VFX intensity slider. Pair color-coded brick HP with a non-color cue (Android guidance: 4.5:1 contrast for small text, 48dp touch targets). |
| **Deterministic replay / ghost-of-your-best-run** | Almost free given a deterministic fixed-timestep engine + recorded inputs, and it's a real score-chase hook no mobile competitor offers. | MEDIUM | Defer to v1.x, but *don't* break the determinism that makes it possible (no `Math.random()` outside a seeded PRNG, no wall-clock-dependent physics). |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Several of these are things the *incumbent mobile games actually ship* and get punished for.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Paddle-shrink / speed-down power-downs** | Classic Arkanoid had them; they seem to add difficulty for free. | Punishing the player for succeeding (they only drop because you broke bricks) feels arbitrary. Shatter's designers explicitly refused paddle-shrink and self-destruct penalties, and reviewers named this "player-positive philosophy" as a main reason players came back. | Create difficulty through level geometry, ball speed, and brick layout. If you want negative drops later, make them *avoidable and clearly telegraphed*, never instant-punish. |
| **Off-the-shelf rigid-body physics (Box2D/Matter) for the ball** | "Realistic physics" sounds like an upgrade, and it's less code than writing your own. | A general solver "wants to control everything" — artificially setting ball velocity fights the integrator, and the math goes unstable in exactly the configurations Breakout produces (high speed, thin walls, repeated impacts). It also destroys determinism and testability. | The custom fixed-timestep swept-collision engine already in PROJECT.md. Constant-speed reflection with angle mapping is *more* fun than realistic physics here, not less. |
| **Random jitter added to bounces to break stalls** | It's the two-line fix for infinite ricochet loops. | It silently breaks the player's trust model. Once trajectories are unpredictable, the "30% physics toy" pillar is gone and every miss feels cheap. | Deterministic angle clamping (never near-horizontal), plus an explicit, *visible* escalation after a stall timer (ball speeds up, or a telegraphed nudge). Players accept rules they can see. |
| **Absolute finger-follow paddle control** | It's the obvious first implementation and feels intuitive for ~10 seconds. | Thumb occludes the action zone; every finger re-press teleports the paddle, producing deaths the player didn't cause. This is the "inconsistent paddle physics" complaint in competitor reviews. | Relative drag with clamping and smoothing (see table stakes). |
| **Tilt / gyro controls** | Novel, "uses the hardware." | Unplayable lying down, on transit, or one-handed; poor precision; forces the screen off-axis from the eyes. Reflex games need sub-frame input, not accelerometer noise. | Touch only. Ship one control scheme and make it excellent. |
| **Turn-based aim-and-shoot ("ballz") mechanics** | It's what's popular in mobile "brick breaker" search results. | It's a different genre with a different audience and it removes the real-time paddle skill that is this product's entire reason to exist. Adopting it would put you in direct competition with free, well-funded, content-saturated incumbents. | Stay a paddle game. The paddle niche is the open lane. |
| **Modal text tutorial / unskippable intro** | "Players need to be told the controls." | Modal tutorial walls have the worst completion rates in live-service telemetry; players mash through and retain nothing. On mobile, uninstall is one tap away. | Teach through the docked-ball launch moment and one contextual, self-dismissing hint. Target: first meaningful interaction inside 60 seconds of app open, per Apple's own onboarding guidance. |
| **"Thousands of levels" / endless procedural generation** | It's what every competitor advertises, so it looks like the price of entry. | Competitor reviews show it produces uneven, sometimes unfair difficulty and content fatigue — "difficulty ramps up unevenly… sometimes a level is a breeze, then the next feels borderline unfair." It also directly contradicts the one-polished-level MVP. | One authored level, replayed for score. Prove the loop, then add authored levels in curated sets. |
| **Ads, IAP, currencies, or a shop in MVP** | Standard mobile monetization. | The loudest recurring complaint against every competitor examined: forced interstitials on resume, ads that freeze the game and lose progress, and shop pricing described as "ridiculous." Shipping monetization before the loop is proven imports the exact problems you'd be differentiating against. | Keep clean seams (an events/telemetry boundary, a "run ended" hook) but ship nothing. Already correct in PROJECT.md. |
| **Online leaderboards / Game Center / Play Games sign-in in MVP** | Free competition and retention. | Violates the offline-first mandate, adds a sign-in surface Apple scrutinizes, and adds a privacy-disclosure burden to an otherwise zero-data app. | Local high score + personal best. Add platform leaderboards only after the loop is validated, as an optional, skippable sign-in. |
| **Analytics SDK in MVP** | "We need to know where players drop off." | Converts a genuinely zero-data app into one requiring real privacy disclosures on both stores, and adds an SDK to the hot path. | Instrument a *local* event bus with the right event names now (`app_ready`, `first_interaction`, `level_start`, `level_end`, `session_end`) and wire a backend later. The taxonomy is the valuable part; the network call isn't. |
| **Background music in MVP** | Shatter's soundtrack is legendary; music sells the spectacle. | Real risk of a scope sink — Shatter's audio alone took 12+ months. Already out of scope in PROJECT.md. | Keep the modular audio hook. **Mitigation to plan for:** a game with SFX and no music can feel hollow. Consider a single short ambient loop as the v1.x first addition, and make sure the SFX mix is dense enough to carry the level alone. |
| **Level editor in MVP** | The data format is already there, so the editor "is nearly free." | It isn't. Editors need undo, validation, persistence, preview, and their own UI layer — easily as large as the game. | Data format now, editor after the loop ships. Already correct in PROJECT.md. |

## Feature Dependencies

```
Responsive Paddle Control (relative drag)
    └──requires──> Input Layer (decoupled from React render)
                       └──requires──> Fixed-Timestep Game Loop

Non-Clipping Collision (swept CCD)
    └──requires──> Custom Deterministic Physics Engine
                       └──requires──> Fixed-Timestep Game Loop
    └──enables───> Unit Tests for Collision
    └──enables───> Deterministic Replay / Ghost  [v1.x]

Paddle-Relative Bounce Angle
    └──requires──> Responsive Paddle Control
    └──requires──> Non-Clipping Collision
    └──conflicts─> Paddle Expand  (angle mapping must normalize to CURRENT width)

Ball Launch Control (docked ball)
    └──requires──> Paddle-Relative Bounce Angle
    └──enables───> Onboarding-by-doing (no modal tutorial)

Multi-HP Brick Types
    └──requires──> Data-Driven Level Format
    └──enables───> Score + Combo
    └──enables───> Power-Up Drops

Score + Combo
    └──requires──> Brick Destruction Events (game-logic event bus)
    └──enables───> Local High Score
    └──enables───> Combo-Driven Escalating Feedback

Power-Ups (multi-ball, paddle expand)
    └──requires──> Drop Entity + Paddle Catch Collision
    └──requires──> Timed Effect System (stacking, expiry)
    └──requires──> Brick Destruction Events
    Multi-Ball ──conflicts──> Lives Semantics
                (a life is lost only when the LAST ball drops)
    Multi-Ball ──stresses───> Collision Engine + Particle Budget (worst-case frame)

Neon VFX (glow, trails, particles, shake)
    └──requires──> Render Layer separated from Game Logic
    └──requires──> Pooled Particle System with a hard budget
    └──requires──> On-Device Performance Harness  (else 60 FPS is unverifiable)
    └──conflicts──> Ball/Paddle Readability  (Game Token Priority 1)
    └──conflicts──> Motion Accessibility
                (resolved by a single global VFX intensity scalar)

Pause + Safe Resume
    └──requires──> Game Loop decoupled from React state
    └──requires──> App Lifecycle Hooks (background/foreground/interruption)
    └──requires──> Accumulator clamping (no catch-up spiral on resume)

Local High Score
    └──requires──> Offline Persistence Layer
    └──requires──> Score + Combo

Paddle Bump  [differentiator]
    └──requires──> Paddle-Relative Bounce Angle
    └──enhances──> Anti-Stall Mitigation  (gives the player agency on the last brick)
    └──enhances──> Combo System  (bumped hits can power up the ball)

Hand-Crafted Showpiece Level
    └──requires──> Data-Driven Level Format
    └──requires──> Multi-HP Brick Types
    └──requires──> Power-Ups  (layouts are designed AROUND drop placement)
    └──requires──> Tuned Ball Speed + Paddle Feel  (authoring against a moving
                   target wastes the most expensive work in the project)
```

### Dependency Notes

- **Everything requires the fixed-timestep loop first.** Input, physics, and rendering all hang off it. It is the true phase-one deliverable; nothing downstream can be tuned until frame timing is stable.
- **Paddle expand conflicts with bounce-angle mapping.** If the angle curve is computed against a hardcoded paddle half-width, the expand power-up silently changes the control feel mid-run — the ball comes off a wide paddle at angles the player didn't intend. Normalize contact offset against the *current* width, and decide deliberately whether expand should also soften the maximum angle (it makes the game easier twice over if it doesn't).
- **Multi-ball conflicts with lives semantics and with the frame budget.** Two decisions must be made before implementing it: (1) a life is lost only when the last ball leaves play; (2) the worst-case frame is *N balls × particle burst × glow passes*, so the performance harness must measure that case, not the idle case.
- **Neon VFX conflicts with readability and with accessibility, and both resolve the same way.** A single global intensity scalar (driven by the OS reduce-motion flag plus a user slider) lets you dampen rather than delete. Build the scalar into the emitter API from the first particle, not as a retrofit.
- **Level authoring must come after feel tuning.** The level is the most expensive hand-made artifact in the MVP. Authoring it against un-tuned ball speed, paddle width, or drop rates means re-authoring it. Lock the feel constants, then build the level.
- **Ball trail is both spectacle and readability.** It sits in both the VFX budget and the table-stakes set. If VFX intensity is dampened for accessibility, the trail must degrade to a high-contrast minimum rather than disappearing.
- **The performance harness is a dependency, not a QA step.** PROJECT.md already says 60 FPS must be measured on hardware. Practically, that means the harness has to exist *before* the VFX work, or the particle budget will be set by guesswork.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **Fixed-timestep game loop, decoupled from React** — every other feature's correctness depends on it
- [ ] **Relative-drag paddle control, tuned on hardware** — the genre's single point of failure
- [ ] **Swept, deterministic collision (paddle/walls/bricks) with unit tests** — clipping is the #1 competitor complaint
- [ ] **Paddle-relative bounce angle with degenerate-angle clamping** — this is where skill lives
- [ ] **Docked ball + aimed launch** — fair life starts, and the onboarding moment
- [ ] **Multi-HP brick types with non-color damage cues** — layout depth and readability
- [ ] **Data-driven level format** — required to author the level at all, and the editor's foundation
- [ ] **One hand-crafted ~2–3 min level with authored escalation** — the whole product thesis
- [ ] **Score + combo** — the only reason to replay a single level
- [ ] **Lives + clear win/lose states** — stakes
- [ ] **Multi-ball + paddle expand power-ups, caught on the paddle** — archetypal, and they create the chase-ball-or-chase-drop choice
- [ ] **Anti-stall mitigation (angle clamp + stall escalation)** — the genre's structural flaw
- [ ] **Pause, OS-lifecycle auto-pause, and countdown resume** — losing a run to a phone call is a one-star review
- [ ] **Instant restart** — score chasing needs a sub-second retry
- [ ] **Core SFX, frame-accurate to impacts** — silence reads as broken
- [ ] **Neon VFX with a global intensity scalar and a hard particle budget** — the identity, safely bounded
- [ ] **Local high score persistence** — the offline score chase
- [ ] **Responsive layout with safe-area handling** — unplayable without it on modern phones
- [ ] **Measured 60 FPS on mid-range hardware (worst-case frame)** — the feel promise
- [ ] **Privacy policy URL, Play Data Safety form, honest age rating** — hard store gates even for a zero-data app

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Paddle bump** — trigger: core feel locked and players report dead time waiting for the ball. Highest-value differentiator per unit of effort.
- [ ] **Haptics** — trigger: SFX mix is final; haptics should reinforce, not fight, the audio.
- [ ] **Combo-tier escalating juice (hit-stop, trail/shake scaling)** — trigger: combo system produces a meaningful distribution of tiers in playtests.
- [ ] **Full motion/VFX accessibility panel** — trigger: first external playtest surfaces discomfort, or before wide store release, whichever is first.
- [ ] **A single ambient music loop** — trigger: playtesters describe the level as "quiet" or "flat" despite good SFX.
- [ ] **2–4 additional authored levels + a level select** — trigger: the first level's replay curve flattens.
- [ ] **Local telemetry taxonomy wired to a real backend** — trigger: you need drop-off data to decide what to build next.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Shatter-style pull/push paddle forces** — high complexity, needs a second input channel and deep rebalancing of every existing level. Genuinely transformative, but it changes the game, so it needs a validated game first.
- [ ] **Deterministic replay / ghost runs** — cheap only if determinism is preserved; a nice score-chase hook but not a retention driver on its own.
- [ ] **Level editor + community levels** — defer until the format has survived several levels of real authoring.
- [ ] **Platform leaderboards / achievements** — adds sign-in and privacy surface; only worth it with a proven score chase.
- [ ] **Cosmetic IAP (ball/trail/destruction skins)** — the one monetization competitors do *without* being hated for it. Needs a reason to exist first.
- [ ] **Rewarded-ad continues** — least-hated ad format in this genre, but only as an opt-in continue, never as a forced interstitial.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Fixed-timestep loop, decoupled from React | HIGH (indirect) | MEDIUM | P1 |
| Relative-drag paddle control | HIGH | MEDIUM | P1 |
| Swept deterministic collision + tests | HIGH | HIGH | P1 |
| Paddle-relative bounce angle + clamping | HIGH | LOW | P1 |
| Docked ball + aimed launch | MEDIUM | LOW | P1 |
| Multi-HP brick types | HIGH | LOW | P1 |
| Data-driven level format | MEDIUM (indirect) | MEDIUM | P1 |
| One hand-crafted showpiece level | HIGH | MEDIUM-HIGH | P1 |
| Score + combo | HIGH | LOW | P1 |
| Lives + win/lose states | HIGH | LOW | P1 |
| Multi-ball + paddle expand | HIGH | MEDIUM | P1 |
| Anti-stall mitigation | HIGH | MEDIUM | P1 |
| Pause + lifecycle auto-pause + resume | HIGH | MEDIUM | P1 |
| Instant restart | MEDIUM | LOW | P1 |
| Core SFX | HIGH | LOW | P1 |
| Neon VFX + intensity scalar + budget | HIGH | MEDIUM-HIGH | P1 |
| Ball trail (readability half) | HIGH | LOW | P1 |
| Local high score | MEDIUM | LOW | P1 |
| Responsive layout + safe areas | HIGH | MEDIUM | P1 |
| 60 FPS perf harness on device | HIGH (indirect) | MEDIUM | P1 |
| Store compliance baseline | HIGH (blocking) | LOW | P1 |
| Paddle bump | HIGH | MEDIUM | P2 |
| Haptics | MEDIUM | LOW | P2 |
| Combo-tier escalating juice | MEDIUM | MEDIUM | P2 |
| Motion/VFX accessibility panel | MEDIUM | LOW-MEDIUM | P2 |
| Ambient music loop | MEDIUM | LOW | P2 |
| Additional levels + level select | MEDIUM | MEDIUM | P2 |
| Local telemetry taxonomy | LOW (now) | LOW | P2 |
| Shatter-style pull/push | HIGH | HIGH | P3 |
| Deterministic replay / ghost | MEDIUM | MEDIUM | P3 |
| Level editor | LOW (player-facing) | HIGH | P3 |
| Platform leaderboards | MEDIUM | MEDIUM | P3 |
| Cosmetic IAP | LOW | MEDIUM | P3 |
| Rewarded-ad continues | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Ballistic / Brick Out / Legend Balls (mobile ballz incumbents) | Shatter (console/PC, visual + design reference) | Our Approach |
|---------|--------------|--------------|--------------|
| Core input | Drag to aim, tap to fire a volley; turn-based, no continuous control | Real-time paddle with continuous pull/push force | Real-time relative-drag paddle — the mobile lane nobody occupies |
| Player agency between hits | None; you watch the volley resolve | Constant — pull/push influences ball, shards, and blocks at all times | Paddle bump in v1.x as the affordable version of the same idea |
| Last-brick problem | Sidestepped by descending rows and turn limits | Explicitly solved via pull/push | Angle clamping + stall escalation in v1; paddle bump in v1.x |
| Collision quality | Frequently reported clipping and "inconsistent paddle physics" | Precise, with an on-screen impact indicator | Swept CCD + unit tests; treat clipping as a P1 correctness bug |
| Power-up design | Large grab-bag (fireball, lightning, freeze, ghost, split); some gated behind currency | Deliberately streamlined to two families; **no** paddle-shrink penalties | Two archetypes done well (multi-ball, expand), no power-downs |
| Brick variety | Deep (healer, bomb, barrier, regen, splash, absorbing, moving) | Physics-reactive blocks and shards | 1-hit / multi-HP / unbreakable in v1; exotic types are v1.x level-design fuel |
| Content model | "Thousands of levels," procedurally uneven, reviewed down for difficulty spikes | ~100 authored levels across themed worlds with boss fights | One authored showpiece level, score-chase replay |
| Visuals | Competent; some offer selectable destruction effects | Neon/futuristic, particle-heavy, widely praised | Neon identity with a hard readability rule: nothing out-competes the ball |
| Audio | Functional SFX | 90+ minutes of original music, a headline feature | Minimal SFX in v1 (modular hook); ambient loop first in v1.x |
| Monetization | Forced interstitials, currencies, shops — the dominant complaint | Premium, buy-once | Premium/offline, zero ads, clean seams only |
| Offline | Usually yes (a genuine strength players cite) | N/A | Yes — fully offline, and no data collected |
| Accessibility | Essentially absent | Limited | Motion/VFX intensity scalar + non-color HP cues as a deliberate differentiator |

## Sources

**Genre design canon (HIGH confidence — primary, authored by a genre practitioner):**
- Gamasutra/Game Developer, "Breaking Down Breakout: System And Level Design For Breakout-style Games" — https://www.gamedeveloper.com/design/breaking-down-breakout-system-and-level-design-for-breakout-style-games — core element taxonomy, paddle speed/size/friction/bump, ball motion simulation, Game Token Priority, Level Quality Checklist, casual-vs-hardcore tuning, and interviews with the leads of LEGO Bricktopia and BreakQuest on physics-engine instability.

**Shatter design reference (MEDIUM-HIGH — one design essay plus two reviews and a developer interview, mutually corroborating):**
- Game Developer, "Shatter solved The Breakout Problem" — https://www.gamedeveloper.com/design/shatter-solved-the-breakout-problem-please-don-t-keep-making-the-same-mistake-
- Eurogamer, Shatter review — https://www.eurogamer.net/shatter-review
- PCWorld, Shatter review (no paddle-shrink penalties; "player-positive philosophy") — https://www.pcworld.com/article/456672/review-shatter-combines-bullet-hell-with-brick-breaking-heaven.html
- TheSixthAxis, Sidhe interview (last-brick issue named explicitly; scope discipline in small games) — https://www.thesixthaxis.com/2009/07/21/interview-sidhe-on-shatter/
- Game Developer, Road to the IGF: Sidhe's Shatter (12+ months on audio alone) — https://www.gamedeveloper.com/game-platforms/road-to-the-igf-sidhe-s-i-shatter-i-

**Competitor store listings + reviews (MEDIUM — live primary listings; review claims are user-reported, not verified):**
- Ballistic: Brick Breaker (App Store), Brick Out: Shoot the Ball (Play), Brick Breaker: Legend Balls (Play), Bricks Breaker Dash (App Store)
- appviewable, Brick Out review 2026 (collision clipping, inconsistent paddle physics) — https://appviewable.com/apps/app-brick-out-shoot-the-ball/

**Mobile control patterns (MEDIUM — practitioner write-ups, consistent across sources):**
- jjunior.net, "Why Glydra uses relative-drag control" — https://jjunior.net/articles/why-glydra-uses-relative-drag-control/
- Cursa, Touch Controls for Mobile Games: input patterns, drag thresholds, keeping the controlled object clear of the finger
- Jake Gordon, "Touch Support for Mobile Breakout" — https://jakesgordon.com/writing/adding-touch-to-breakout/

**Store requirements (HIGH — official vendor documentation):**
- Apple App Review Guidelines (privacy policy link required in metadata *and* in-app; honest age rating; no forced login without account-based features) — https://developer.apple.com/app-store/review/guidelines/
- App Store Connect, Manage app privacy (privacy policy URL required for all apps) — https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- Google Play, Data safety section (required for **all** apps, including those collecting no data; privacy policy link required) — https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play, User Data policy — https://support.google.com/googleplay/android-developer/answer/10144311

**Onboarding + accessibility (MEDIUM-HIGH — Apple/Android official plus corroborating practitioner sources):**
- Apple Developer, Onboarding for Games — https://developer.apple.com/app-store/onboarding-for-games/
- App Store Connect, Reduced Motion evaluation criteria (make motion triggers optional; provide alternatives rather than deleting meaningful animation) — https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria/
- Android Developers, Make apps more accessible (4.5:1 / 3:1 contrast thresholds, 48dp touch targets) — https://developer.android.com/guide/topics/ui/accessibility/apps
- grzegorzotto.dev, "Reduced motion as a first-class mechanic" (dampened rather than binary motion reduction) — https://grzegorzotto.dev/blog/reduced-motion-game-accessibility

**Known gaps / lower confidence:**
- No React Native Skia–specific particle throughput benchmarks were found. The particle budget must be established empirically on target hardware; treat every VFX complexity estimate here as provisional until the performance harness exists.
- No authoritative data on paddle-genre commercial performance on mobile app stores. The "under-served niche" read is inferred from store search composition, not from revenue data — it is a plausible opportunity, not a validated one.
- Haptics impact on perceived game feel is asserted from general mobile UX guidance, not from genre-specific research.

---
*Feature research for: paddle-and-ball brick breaker, offline neon mobile arcade*
*Researched: 2026-09-19*
