# Milestones — Pulse Paddle

Shipped history. The active plan is always `.planning/ROADMAP.md`.

---

## v1.0 — MVP: one shippable 60-FPS arcade level

**Status:** Closed 2026-09-24 (temporary MVP close — iOS internal / soft playtest authorised)
**Roadmap:** [`milestones/v1.0-ROADMAP.md`](./milestones/v1.0-ROADMAP.md) · execution log in [`milestones/v1.0-phases/`](./milestones/v1.0-phases/)
**Scope:** 8 phases, 47 of 48 plans.

| Phase | Delivered |
|-------|-----------|
| 1 | Worklet-hosted sim + Skia render bet proven on device; layer contract enforced |
| 2 | Deterministic swept physics, no tunneling at 2× max speed, golden-replay hash |
| 3 | First playable — render, relative-drag input, bricks, lives, pause |
| 4 | Versioned level format, multi-HP + structural bricks |
| 5 | Score, combo, power-ups, anti-stall |
| 6 | UI shell, HUD, AsyncStorage persistence, platform seams |
| 7 | Neon VFX + audio under frame budget |
| 8 | Showpiece level, perf certification harness, store-compliance baseline |

**Carried out of v1.0:** PLT-03 (Android gfxinfo), D2/D4 device profiling, D13 typecheck gate.

---

## v1.1 — Post-MVP: hardening, expansion, progression, polish

**Status:** **Code complete 2026-09-25. Store track open.**
**Roadmap:** [`post-mvp/ROADMAP-NEXT.md`](./post-mvp/ROADMAP-NEXT.md) · phases in [`post-mvp/phases/`](./post-mvp/phases/)

Ran outside the GSD phase registry, so `gsd-sdk` never saw these phases and every one was
driven by hand. v1.2 returns to the standard layout.

| Phase | Outcome |
|-------|---------|
| A1 iOS ceiling cert | **PASS** — p50 8.9 / p95 16.1 ms, Hangs 0; floor still `NOT RUN` (R-10) |
| A2 soak + regression floor | **PASS** — physical soak, contract tests green |
| A3 playtest cohort | **SKIPPED** (owner) — no serve-agency data ⇒ B0 Won't-Do |
| A4 operational readiness | N-OPS-02/03 done; **N-OPS-01 Sentry DSN deferred** |
| B1/B2/B3 gameplay | Explosive bricks; extra life + slow + drop table; fireball pierce |
| C1/C2 progression | Progress v2→v3, level select, lives-stars, replay |
| D1 juice | Brick ghosts, paddle squash, haptics — Human UAT approved |
| **D2 brand** | Renamed **Pulse Paddle**; template Expo icon replaced; verified on device |
| E1a content | 5 ship levels + N-LVL-03 solvability lint |
| **E1b verbs** | Explosive placed on a teaching curve (B1 had shipped it into zero levels) |
| **E2 balance** | Curve reordered `01→04→05→06→03`; F-45 speed ramp shipped at 0.01/s |
| F1/F2 store | **Not started** — owner/account work |

**Open at close of v1.1 — carried into v1.2:**

| Item | Why it is still open |
|------|----------------------|
| §5d ceiling cert | E2's ramp raised sustained ball speed; §5/§5b/§5c predate it |
| ASC uniqueness for "Pulse Paddle" | Never searched; the old name died of an exact-title collision |
| N-OPS-01 Sentry DSN | Owner deferred; also breaks local `expo run:ios` without `SENTRY_DISABLE_AUTO_UPLOAD` |
| Owner sign-off on E2 curve + ramp | E2's stated acceptance, not obtained |
| R-10 floor tier / R-12 tier resolver | Ceiling-only evidence; owner pick pending |
| Human playtest cohort | A3 skipped — nothing here has been validated by a real player |
