---
phase: "12"
slug: "daily-challenge"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-27"
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded by `plan-phase` from `12-RESEARCH.md` § Validation Architecture. Task IDs are filled
> by the planner; the requirement→test map below is the research's, unchanged.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.0.1 (`package.json` devDependencies) — already installed, nothing to add |
| **Config file** | `vitest.config.ts` — `environment: 'node'`, include `['src/core/**/*.test.ts', 'tests/**/*.test.ts', 'tests/**/*.test.tsx']`, `resolve.alias` maps `react-native` → `react-native-web` |
| **UI environment** | per-file docblock `@vitest-environment jsdom` (e.g. `tests/ui/HudStrip.test.tsx:4`) — **not** global |
| **Quick run command** | `npx vitest run tests/daily` |
| **Full suite command** | `npm test` (`vitest run` + the four `assert-*.mjs` scripts) |
| **Estimated runtime** | ~70 seconds full suite (measured: 99 files / 663 tests at the phase-11 close) |

**Two gates are load-bearing this phase and are not optional:**

- `npm run typecheck` — the `RecordRunEndArgs` daily arm is enforced by the **compiler**, not by
  a test. A green suite says nothing about whether both stores compile.
- `npm run lint` — `boundaries/dependencies` in `eslint.config.js` is the only thing preventing
  `DailyResultOverlay` from importing `src/services/storage`. No unit test observes that.

---

## Sampling Rate

- **After every task commit:** `npx vitest run tests/daily && npm run typecheck`
- **After every plan wave:** `npm test && npm run typecheck && npm run lint`
- **Before `/gsd-verify-work`:** full suite green, and every device-verification item below either
  resolved or explicitly routed to human verification
- **Max feedback latency:** ~70 seconds (full suite); ~5 seconds (`tests/daily` quick run)

---

## Per-Task Verification Map

Task IDs are assigned by the planner. The requirement→behaviour→command rows are from
`12-RESEARCH.md` § Validation Architecture and are reproduced here unchanged.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | N-DAILY-01 | — | N/A | unit | `npx vitest run tests/daily.date-key.test.ts -t "local not UTC"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-DAILY-01 | — | N/A | unit | `npx vitest run tests/daily.date-key.test.ts -t "locale invariant"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-DAILY-01 | — | N/A | unit (TZ-pinned) | `npx vitest run tests/daily.date-key.test.ts -t "skipped midnight"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-DAILY-01 | — | N/A | unit (TZ-pinned) | `npx vitest run tests/daily.date-key.test.ts -t "25 hour day"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-DAILY-01 | — | N/A | unit (TZ-pinned) | `npx vitest run tests/daily.date-key.test.ts -t "not plus 24h"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-DAILY-01 | — | N/A | unit | `npx vitest run tests/daily.date-key.test.ts -t "rollover"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-DAILY-01 | — | N/A | unit | `npx vitest run tests/daily.board.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-DAILY-01 | — | no network on the daily path | unit (source contract) | `npx vitest run tests/daily.board.test.ts -t "no network"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-DAILY-02 | — | N/A | integration | `npx vitest run tests/daily.record.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-DAILY-02 | — | N/A | integration | `npx vitest run tests/daily.record.test.ts -t "abandoned leaves open"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-DAILY-02 | — | bounded at write AND at read | unit | `npx vitest run tests/daily.record.test.ts -t "bounded"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-DAILY-02 | — | N/A | unit | `npx vitest run tests/daily.streak.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-DAILY-02 | — | never substitutes `longestStreak` | unit | `npx vitest run tests/daily.streak.test.ts -t "window floor"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-DAILY-03 | — | N/A | unit (TZ + injected clock) | `npx vitest run tests/daily.clock-policy.test.ts -t "backwards"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-DAILY-03 | — | no anti-cheat branch exists | unit | `npx vitest run tests/daily.clock-policy.test.ts -t "forwards"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-DAILY-03 | — | **SC-5 firewall** — campaign/endless byte-identical | integration | `npx vitest run tests/storage.daily-firewall.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | N-DAILY-03 | — | tampered key degrades to "no result" | unit | `npx vitest run tests/daily.record.test.ts -t "invalid key"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UI-SPEC | — | N/A | integration (jsdom) | `npx vitest run tests/ui/PlayingHost.daily-run.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UI-SPEC | — | date stays open on abandon | integration (jsdom) | `npx vitest run tests/ui/PlayingHost.daily-run.test.tsx -t "abandoned"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UI-SPEC | — | N/A | unit (jsdom, injected `now`) | `npx vitest run tests/ui/DailyResultOverlay.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UI-SPEC | — | no `Retry`, no star row, no `Best ·` | unit (jsdom) | `npx vitest run tests/ui/DailyResultOverlay.test.tsx -t "closed date"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Every file below is new. **No framework install is needed** — vitest is already the project's
runner and TZ pinning was verified working this session.

- [ ] `tests/daily.date-key.test.ts` — N-DAILY-01 date derivation, DST, locale invariance, rollover
- [ ] `tests/daily.board.test.ts` — determinism, distinctness over 731 keys, no-network source contract
- [ ] `tests/daily.record.test.ts` — N-DAILY-02 once-per-date, `abandoned` leaves open, bounded history, invalid key
- [ ] `tests/daily.streak.test.ts` — `streakFrom`, gap reset, D-16 scalars surviving the trim
- [ ] `tests/daily.clock-policy.test.ts` — N-DAILY-03 backwards / forwards, TZ + injected clock
- [ ] `tests/storage.daily-firewall.test.ts` — SC-5; **model on the shipped `tests/storage.endless-firewall.test.ts`**
- [ ] `tests/ui/PlayingHost.daily-run.test.tsx` — **model on the shipped `tests/ui/PlayingHost.endless-run.test.tsx`**
- [ ] `tests/ui/DailyResultOverlay.test.tsx` — panel, countdown forms, closed-date absences

**TZ-pinning rules for any spec that reassigns the zone** (`process.env.TZ` is process-global and
vitest reuses a worker across files):

```ts
const ORIG_TZ = process.env.TZ;
afterEach(() => { process.env.TZ = ORIG_TZ; });
```

Never rely on the ambient zone — a test that passes only in `Asia/Manila` fails in CI.

---

## Manual-Only Verifications

Five items the research labelled device-verification rather than folding into a recommendation.
They are routed here so the honest-verifier path can reach them instead of a `render()` assertion
being mistaken for evidence.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hermes caches the device timezone per runtime | N-DAILY-03 | A C `localtime_r` control saw a zone change immediately; Hermes's `Date` did not until a fresh runtime. Cannot be reproduced in Node | Change the device timezone with the app foregrounded; confirm the date key does not move until relaunch. Record the observed behaviour in the N-DAILY-03 policy doc |
| Android `Intl`/ICU4J parity with the iOS measurement | N-DAILY-01 | The JSI harness ran the iOS Hermes slice. Android is `-DHERMES_ENABLE_INTL=True` + ICU4J per `ReactAndroid/hermes-engine/build.gradle.kts:358` — read, not executed | Run the locale-invariance check on a physical Android device under a non-Gregorian locale |
| Daily Result panel horizontal fit at extreme values | UI-SPEC E1 | jsdom performs no layout; the 27-char budget is computed from font metrics | 7-digit score, 4-digit streak, 5-digit days-played on a 320px panel — no wrap, no clipping |
| Daily Result panel vertical fit | UI-SPEC cross-element | jsdom performs no layout; safe-area insets are device-supplied | 320×568pt viewport, fully-populated 11-row panel, `Menu` CTA visible without scrolling |
| `Daily` control reachable in the non-wrapping dev row | UI-SPEC E5 | Row width is computed from font metrics and style values, never observed | 375pt-wide viewport; confirm `Daily` is fully on-screen and tappable |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 70s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
