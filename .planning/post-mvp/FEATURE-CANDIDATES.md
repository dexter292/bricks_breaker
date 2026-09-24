# FEATURE CANDIDATES — Post-MVP

**Status:** Candidates only — **not** approved requirements  
**Date:** 2026-09-24  
**Legend:** Complexity S/M/L/XL · Milestone suggestions refer to ROADMAP-NEXT draft

---

## How to read this list

Each candidate lists player value, gameplay impact, relative complexity, architecture touch points, dependencies, risks, and a **suggested** milestone. Only items promoted into `REQUIREMENTS-NEXT.md` as **Approved** become roadmap commitments.

---

## A. Gameplay — bricks & obstacles

| ID | Feature | Player value | Gameplay impact | Cx | Architecture | Deps | Risks / maintenance | Suggested |
|----|---------|--------------|-----------------|----|--------------|------|---------------------|-----------|
| FC-B01 | **Explosive brick** (AoE damage on break) | Spectacle + layout strategy | High — chain clears change pacing | M | Schema flag + cascade damage in `step`/`rules`; EventCode; VFX burst under budget | Schema migration | Combo/score inflation; particle spikes | B |
| FC-B02 | **Reinforced / regenerative** (heal or phase) | Puzzle depth | Medium | M | Brick flags + tick rule | Schema | Anti-stall interaction; hard to read | Deferred |
| FC-B03 | **Moving bricks** (horiz/vert path) | Dynamic boards | High | L | Brick vx/vy SoA; invalidate lattice/broadphase; hash | Physics redesign-ish | Determinism + Mid FPS risk | G / late B |
| FC-B04 | **Portal / teleporter pair** | Trajectory toys | Medium | M | Brick type + remap ball pos on hit | Schema | Tunneling edge cases | Deferred |
| FC-B05 | **One-way / angled deflector** | Skill corridors | Medium | M | Resolve bounce override by brick type | Schema | Angle-floor fights | Deferred |
| FC-B06 | **Boss brick / multi-phase core** | Set-piece drama | High | XL | HP phases, scripted patterns, UI | B + C content | Scope sink; not reusable | G |
| FC-B07 | Multi-HP (already shipped) | Readable toughness | — | — | Exists | — | — | Done |
| FC-B08 | Unbreakable steel (already shipped) | Channeling | — | — | Exists | — | — | Done |

**Priority recommendation:** FC-B01 first; hold moving bricks until iOS ceiling (and ideally floor) budgets proven.

---

## B. Power-ups

| ID | Feature | Player value | Gameplay impact | Cx | Architecture | Deps | Risks | Suggested |
|----|---------|--------------|-----------------|----|--------------|------|-------|-----------|
| FC-P01 | Multi-ball (shipped) | Chaos/skill | High | — | Exists | — | Cap 8 balls | Done |
| FC-P02 | Paddle expand (shipped) | Forgiveness | Medium | — | Exists | — | — | Done |
| FC-P03 | **Extra life** | Recovery | Medium | S | Pickup → `lives++` clamp; no timed effect | Pickups enum | Softens FAIL; drop rate must be rare | B |
| FC-P04 | **Slow-motion ball** (global speed scale timed) | Control window | Medium | S–M | Effect type; scale vx/vy once on apply/expire; stall interaction | Effects SoA | Feels “cheap”; must expire cleanly | B |
| FC-P05 | **Fireball** (pierce N bricks / timed) | Aggression | High | M | Ball flags; CCD policy change (multi-hit/step) | Physics + effects | Determinism tests mandatory; overpowered clears | B |
| FC-P06 | **Sticky paddle** | Aim reset | Medium | M | Attach state; release intent; dock conflict | PHYS-05 aim optional | State machine complexity | **Deferred (G)** — R-05 unified |
| FC-P07 | **Shield** (absorb 1 miss) | Safety net | Medium | M | Bottom collider or miss counter | Lives rules | Trivializes FAIL | Deferred / monetization continue instead |
| FC-P08 | **Laser paddle** (tap fire) | Active combat | High | L | Projectile SoA + hit scan + input mode | Render + events | Genre drift; Mid FPS | G |
| FC-P09 | Power-up mutual exclusion / rarity table | Balance | — | S | Drop table + active-effect rules | P03–P06 | Needed with expansion | B |

**Balance sketch (proposed, not locked):**
- Max **one** timed offensive effect (fireball XOR slow)
- Extra life drop rate ≪ expand/multiball
- Timed effects: 6–10s; refresh = reset timer, no stack
- No power-downs

**Priority recommendation:** FC-P03 + FC-P04 + FC-P09; FC-P05 if physics tests green; FC-P06 deferred to G; FC-P07/P08 later.

---

## C. Level progression & content

| ID | Feature | Player value | Cx | Architecture | Deps | Risks | Suggested |
|----|---------|--------------|----|--------------|------|-------|-----------|
| FC-L01 | **5 authored levels (D4 locked)** | Replay / campaign | M | More JSON; LevelId catalog | Schema OK | Author **3** via **E1a // A** | E1a + E1b |
| FC-L02 | **Level select UI** | Agency | M | Shell navigation; thumbnails optional | L01 | Scope creep art | C |
| FC-L03 | **Linear unlock** | Motivation | S–M | Storage schema v2 | L01–L02 | Migration from PB-only | C |
| FC-L04 | **Stars (1–3)** | Mastery | S–M | Score/lives thresholds per level; Results UI | L03 | Threshold tuning | C |
| FC-L05 | Chapters / worlds | Structure | M | Meta grouping | L01–L03 | Premature if &lt;8 levels | E / G |
| FC-L06 | Per-level best score | Competition vs self | S | Storage keys | L03 | — | C |
| FC-L07 | Replay cleared levels | Practice | S | Unlock gate | L03 | — | C |
| FC-L08 | **Solvability lint** (no preview UI) | Author safety | M | validate / CI assert | — | Must fail on level-02 | **E1a (D6=A)** |
| FC-L09 | In-app level editor | UGC | XL | Full product surface | TOOL-01 | Huge | **Deferred G+** |
| FC-L10 | Speed ramp (F-45) | Difficulty | S | Constants + rule | Playtest | Duration shrink | E |

---

## D. Game feel & polish

| ID | Feature | Value | Cx | Notes | Suggested |
|----|---------|-------|----|-------|-----------|
| FC-F01 | Brick destroy animation (scale/fade) | Juice | S–M | Keep under budget; don’t hide ball | D |
| FC-F02 | Background subtle parallax / scanlines | Atmosphere | S | Must not hurt readability | D |
| FC-F03 | Screen transitions Title↔Play | Product feel | S | — | D |
| FC-F04 | Paddle press squash / expand juice | Agency | S | Cosmetic only | D |
| FC-F05 | Win/lose presentation upgrade | Closure | S–M | Keep Retry instant | D |
| FC-F06 | Aimed launch + aim ghost | Skill | M | PHYS-05 | **B0 conditional (D3=C)** |
| FC-F07 | Haptics (FX-04) | Feel | S | OS setting respect | D |
| FC-F08 | Combo-tier juice (FX-06) | Reward | M | Hit-stop budget careful | D / G |
| FC-F09 | Ambient music (AUD-01) | Presence | M | Modular; mute path | D optional |
| FC-F10 | App icon + splash + brand pass | Store | S | Required for F | F |
| FC-F11 | Particle color inheritance polish | Cohesion | S | Partially remediations | D |

---

## E. Retention meta

| ID | Feature | Offline? | Cx | Suggested |
|----|---------|----------|----|-----------|
| FC-R01 | Achievements (local) | Yes | M | G |
| FC-R02 | Unlockable cosmetics | Yes | M | G |
| FC-R03 | Daily challenge (seeded) | Yes* | M | G (*needs clock; optional sync later) |
| FC-R04 | Endless mode | Yes | M | G |
| FC-R05 | Local leaderboard (device) | Yes | S | Overlap with stars/PB |
| FC-R06 | Platform leaderboards | No | L | META-01 — G+ |
| FC-R07 | Player statistics screen | Yes | S–M | G |

\*Daily challenge can be fully offline with local date + seeded RNG; no backend required for v1.

---

## F. Mobile product & distribution

| ID | Item | Required for | Suggested |
|----|------|--------------|-----------|
| FC-D01 | Android install smoke | Play internal | A |
| FC-D02 | PLT-03 mid-range certification | Public dual-store claim | A |
| FC-D03 | Physical iOS soak | Public confidence | A |
| FC-D04 | Playtest cohort ≥5 | Content confidence | A / E |
| FC-D05 | Store screenshots / descriptions | Listing | F |
| FC-D06 | Console entry (prepared → submitted) | Listing | F |
| FC-D07 | Name clearance / rename | Public / paid UA | A or F |
| FC-D08 | Privacy / age / Data Safety live in console | Submit | F |
| FC-D09 | Production build strip DEV tooling visual QA | Submit | F |
| FC-D10 | EAS production + TestFlight / Play internal tracks | Soft launch | F |

---

## G. Monetization (design-only candidates)

| ID | Model | Gameplay risk | Notes | Suggested |
|----|-------|---------------|-------|-----------|
| FC-M01 | Rewarded continue (1× per run) | Medium if forced | Use ARCH-02 ads seam; never soft-lock campaign | **G — design only; blocked pre-launch by D5=A** |
| FC-M02 | Interstitial between runs | High annoyance | Avoid mid-rally; optional rare | Likely reject |
| FC-M03 | Cosmetic IAP | Low | Paddle/ball skins | G |
| FC-M04 | Remove ads IAP | Low | Only if ads ship | G |
| FC-M05 | Premium unlock campaign | Medium | Prefer earnable unlock | Design debate |

**Do not integrate SDKs before first ASC approval (D5=A).** Design documents only until post-launch.

---

## H. Explicitly not recommended soon

| Idea | Why |
|------|-----|
| Engine rewrite / Unity | No technical evidence current stack fails goals |
| Accounts / cloud sync | No product need yet |
| Multiplayer | Different product |
| Thousands of procedural levels | Uneven difficulty; contradicts craft focus |
| Paddle shrink power-downs | Already out of scope (player-negative) |

---

## Promotion shortlist (FULL LOCK 2026-09-24)

**Milestone A:** iOS ceiling, soak, cohort (+ serve-agency Q), rename, N-OPS-01…03, N-QA-03  
**Milestone B:** FC-B01, FC-P03, FC-P04, FC-P09, optional FC-P05; FC-F06 only if A3 supports  
**E1a // A:** FC-L01 baseline + FC-L08 lint (N-LVL-03)  
**E1b after B:** verb teaching boards  
**Milestone C:** L02–L04, L06, L07  
**Milestone D:** FC-F01…F05, F07, F10 under new name  
**Milestone F:** ASC package (Play deferred); G2.17 no ads SDK  
**Milestone G:** FC-R*, FC-M* design→SDK, sticky, Android return, editor if pain
