---
phase: C2-level-select-stars-replay
plan: 03
type: execute
wave: 3
depends_on:
  - "C2-02"
files_modified:
  - app/_components/PlayingHost.tsx
  - app/_components/GameHost.tsx
  - src/runtime/loadLevel.ts
  - tests/runtime.loadLevel.test.ts
  - tests/ui/PlayingHost.next-bake.test.ts
  - tests/ui/PlayingHost.bake-gate.test.ts
  - docs/ops/PROGRESS-STORAGE.md
  - docs/ops/SOAK-PHYSICAL.md
  - .planning/post-mvp/REQUIREMENTS-NEXT.md
  - .planning/post-mvp/ROADMAP-NEXT.md
  - .planning/post-mvp/phases/C2-level-select-stars-replay/C2-VALIDATION.md
autonomous: false
requirements:
  - N-PROG-04
  - N-LVL-02
  - N-PROG-03
must_haves:
  truths:
    - "PlayingHost levelId is a required prop; loadLevelById has no default LevelId"
    - "Four call sites correct: required prop; no loadLevel default; cert force level-03 kept; GameHost CERT bypass Select"
    - "handleRunEnded applies recordRunEnd and uses returned blob for Results stars + Next gate"
    - "Next mirrors toggleDevLevel checklist including runEndedRef=false; never setActive(true) in Next"
    - "Behavioral test: setActive(true) is last after levelId change (mock useGameLoop)"
    - "Ops: PROGRESS-STORAGE documents v3+stars; SOAK Select-skip verified; cert arm smoke + post-C2 ceiling re-run noted"
  artifacts:
    - path: "app/_components/PlayingHost.tsx"
      provides: "required levelId; onNext; recordRunEnd→Results blob"
      contains: "levelId: LevelId|recordRunEnd|runEndedRef.current = false|onNext"
    - path: "src/runtime/loadLevel.ts"
      provides: "loadLevelById(id: LevelId) no default"
    - path: "tests/ui/PlayingHost.next-bake.test.ts"
      provides: "D-03 setActive-last GREEN"
    - path: "docs/ops/PROGRESS-STORAGE.md"
      provides: "v3 nested bests + lives-based stars + Select three-state rules"
  key_links:
    - from: "PlayingHost.onNext"
      to: "gate effect setActive(true)"
      via: "setLevelId / onLevelIdChange only — never setActive in Next"
      pattern: "setActive\\(true\\)|setLevelId|runEndedRef"
    - from: "handleRunEnded"
      to: "ResultOverlay stars/onNext"
      via: "returned blob bestByLevel + nextLevelId + isUnlocked"
      pattern: "recordRunEnd|setResult|onNext"
    - from: "GameHost"
      to: "PlayingHost.levelId"
      via: "required prop; CERT forces level-03"
      pattern: "levelId=|level-03"
---

<objective>
Wire required `levelId`, remove `loadLevel` default, implement Next = `toggleDevLevel` checklist + `handleRunEnded` blob→Results, land D-03 bake behavioral test, update ops/reqs docs, and run human UAT + cert-arm smoke gate notes.

Purpose: Close N-PROG-04 replay path and bake-gate invariant on every new levelId entry; document v3 + post-C2 measurement.
Output: PlayingHost/GameHost levelId plumbing + green bake test + ops docs + human verification.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/post-mvp/phases/C2-level-select-stars-replay/C2-CONTEXT.md
@.planning/post-mvp/phases/C2-level-select-stars-replay/C2-RESEARCH.md
@.planning/post-mvp/phases/C2-level-select-stars-replay/C2-PATTERNS.md
@.planning/post-mvp/phases/C2-level-select-stars-replay/C2-02-SUMMARY.md
@.planning/post-mvp/RELEASE-GATES.md
@app/_components/PlayingHost.tsx
@app/_components/GameHost.tsx
@src/runtime/loadLevel.ts
@docs/ops/PROGRESS-STORAGE.md
@docs/ops/SOAK-PHYSICAL.md
@tests/ui/PlayingHost.bake-gate.test.ts

<interfaces>
```typescript
// PlayingHost — AFTER this plan
type Props = {
  onMenu: () => void;
  levelId: LevelId; // REQUIRED — remove useState('level-03') default (D-15 site 1)
  onLevelIdChange?: (id: LevelId) => void; // Next + DEV when controlled from GameHost
};

// Next checklist — MUST match toggleDevLevel exactly (D-13 / CONTEXT specifics):
// setResult(null); setIsNewRecord(false); runEndedRef.current = false;
// setLives(3); setScore(0); setCombo(1); setStallTier(0);
// setSimPhaseNum(SIM.DOCKED); setUiPhase('playing');
// clearCountdown(); setCountdownNumeral(null);
// setLevelId(next) OR onLevelIdChange(next);  // NEVER setActive(true)

// handleRunEnded(runScore, outcome, livesRemaining):
//   const blob = store.recordRunEnd({ levelId, score, outcome, livesRemaining });
//   set Result stars from blob on win; set Next gate:
//     const next = nextLevelId(levelId);
//     onNext = (outcome==='win' && next && blob.unlocked includes next) ? () => goNext(next) : null

// D-15 four call sites (name + verify):
// 1. PlayingHost useState('level-03') → required prop / GameHost activeLevelId
// 2. loadLevelById(id = 'level-03') → remove default
// 3. Cert force effect keeps level-03 + verify-arm note (D-16)
// 4. GameHost CERT initial 'playing' bypass Select (already Plan 02 — re-verify)

// loadLevel.ts
export function loadLevelById(id: LevelId): LoadLevelResult; // no default
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: levelId required + Next + recordRunEnd blob + bake test</name>
  <files>app/_components/PlayingHost.tsx, app/_components/GameHost.tsx, src/runtime/loadLevel.ts, tests/runtime.loadLevel.test.ts, tests/ui/PlayingHost.next-bake.test.ts, tests/ui/PlayingHost.bake-gate.test.ts, tests/ui/GameHost.test.tsx</files>
  <read_first>app/_components/PlayingHost.tsx, app/_components/GameHost.tsx, src/runtime/loadLevel.ts, tests/ui/PlayingHost.bake-gate.test.ts, tests/ui/PlayingHost.next-bake.test.ts, tests/runtime.loadLevel.test.ts, .planning/post-mvp/phases/C2-level-select-stars-replay/C2-CONTEXT.md</read_first>
  <behavior>
    - loadLevelById() without args is a TypeScript error; runtime test no longer asserts default level-03
    - PlayingHost props require levelId; GameHost passes activeLevelId (CERT passes 'level-03')
    - Cert force effect still sets/forces level-03 under CERT
    - handleRunEnded calls recordRunEnd; win Results get stars from returned blob; Next visible iff nextLevelId exists AND unlocked in blob
    - onNext callback body matches toggleDevLevel reset list including runEndedRef.current = false; body must NOT match setActive(true)
    - Behavioral test (mock useGameLoop + fake timers): after Next-driven levelId change, setActive(true) is the last arming call
    - Select remount after Menu→Play still refreshes via Plan 02 mount snapshot (no dual async read on Results)
  </behavior>
  <action>
Per **D-02, D-03, D-10, D-11, D-13, D-14, D-15, D-16**:

1. **loadLevel.ts (D-15 site 2):** Remove default param. Update `tests/runtime.loadLevel.test.ts` — delete default-id assertion; keep explicit id loads.

2. **PlayingHost (D-15 site 1):** Required `levelId` prop + optional `onLevelIdChange`. Remove internal `useState('level-03')` as the play-path source of truth. Prefer controlled pattern: parent owns id; DEV toggle / Next call `onLevelIdChange` (fallback local setState only if uncontrolled — prefer always controlled from GameHost).

3. **Cert force (D-15 site 3):** Keep CERT effect forcing `level-03`. Do not remove.

4. **GameHost (D-15 site 4):** Pass `levelId={CERT_HARNESS ? 'level-03' : activeLevelId}` (or always activeLevelId seeded to level-03 under CERT). Re-verify CERT initial `'playing'` bypass Select.

5. **handleRunEnded:** Pass `livesRemaining` from chrome lives at terminal frame. Call `store.recordRunEnd(...)`. Use returned blob for Results stars (win) and Next gate (`nextLevelId` + unlocked membership). Do **not** dual-`getSnapshot` for Results (D-10). Lose: no stars props / no Next.

6. **onNext:** Exact toggleDevLevel checklist from CONTEXT specifics, including `runEndedRef.current = false`, then change levelId only — **NEVER** `setActive(true)`.

7. **Tests:** Convert `PlayingHost.next-bake` todos → GREEN (source contract on Next + behavioral setActive-last). Extend bake-gate source contract to cover Next callback. Update GameHost mocks for required `levelId`.

Avoid: score-band stars; Menu→Select; inserting Select into CERT/SOAK; remounting whole PlayingHost on Next.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; npx vitest run tests/runtime.loadLevel.test.ts tests/ui/PlayingHost.next-bake.test.ts tests/ui/PlayingHost.bake-gate.test.ts tests/ui/GameHost.test.tsx tests/storage.progress-v3.test.ts && rg -n "levelId: LevelId" app/_components/PlayingHost.tsx && rg -n "loadLevelById\\(id: LevelId\\)" src/runtime/loadLevel.ts && rg -n "recordRunEnd|runEndedRef\\.current = false" app/_components/PlayingHost.tsx && ! rg -n "loadLevelById\\(\\)|id: LevelId = 'level-03'" src/runtime/loadLevel.ts</automated>
  </verify>
  <acceptance_criteria>
    - PlayingHost has no play-path `useState('level-03')` as sole LevelId source (required prop present)
    - `loadLevelById` has no default argument
    - Next / toggleDevLevel bodies: `rg` shows `runEndedRef.current = false`; Next body has no `setActive(true)`
    - `recordRunEnd` used in handleRunEnded; Results stars/onNext derived from returned blob
    - Cert force `level-03` still present under CERT
    - GameHost CERT still starts `'playing'` without Select
    - next-bake + loadLevel + GameHost vitest exit 0
  </acceptance_criteria>
  <done>levelId plumbing + Next bake-safe + blob→Results wired and tested.</done>
</task>

<task type="auto">
  <name>Task 2: Ops docs + reqs amend note + roadmap + VALIDATION</name>
  <files>docs/ops/PROGRESS-STORAGE.md, docs/ops/SOAK-PHYSICAL.md, .planning/post-mvp/REQUIREMENTS-NEXT.md, .planning/post-mvp/ROADMAP-NEXT.md, .planning/post-mvp/phases/C2-level-select-stars-replay/C2-VALIDATION.md</files>
  <read_first>docs/ops/PROGRESS-STORAGE.md, docs/ops/SOAK-PHYSICAL.md, .planning/post-mvp/REQUIREMENTS-NEXT.md, .planning/post-mvp/ROADMAP-NEXT.md, .planning/post-mvp/RELEASE-GATES.md, .planning/post-mvp/phases/C2-level-select-stars-replay/C2-VALIDATION.md</read_first>
  <action>
Per **D-01, D-09, D-16** and CONTEXT docs deliverable:

1. **PROGRESS-STORAGE.md** — extend for v3:
   - Key `@nbb/progress/v3`; nested `{ score, stars? }`; omit stars until first win
   - Stars = `clamp(livesRemaining,1,3)` on win; `max(stored, computed)`; lose no stars write
   - Migrate v1→v3 / v2→v3; leave legacy keys; watermark rules
   - Select three-state table (locked / ☆☆☆ / cleared+Best); remove “default start level-03 until C2”
   - N-PROG-03 amend note: lives-based in C2; score bands → E2 / N-CNT-02; optional max-score spread rationale (~3×)

2. **SOAK-PHYSICAL.md** — verify intentional Select-skip note still accurate for D-01; extend only if wording drifts from implementation.

3. **Ops note (in PROGRESS-STORAGE or short subsection / RELEASE-GATES cross-link):**
   - After play-path/levelId change: **one CERT arm smoke** before measurement (D-16) — confirm inject after remount / `[cert] GameHost CERT=1 phase=playing`
   - After C2 chrome lands: **one** iOS ceiling Cert WC re-run (RELEASE-GATES §6) — do not measure twice

4. **REQUIREMENTS-NEXT.md** — confirm N-PROG-03 amended wording matches (already lives-based); fix only if stale.

5. **ROADMAP-NEXT.md** — set C2 Progress to in-progress/Done as appropriate when code lands; keep plan checklist.

6. **C2-VALIDATION.md** — mark Plan 03 rows; leave `nyquist_compliant` for verify-work; note manual cert-arm + ceiling rows.

Avoid: rewriting soak baseline; measuring ceiling in this plan (process note only).
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; rg -n "@nbb/progress/v3|clamp\\(lives|lives-based|Select" docs/ops/PROGRESS-STORAGE.md && rg -n "skips Level Select|ShellPhase 'select'" docs/ops/SOAK-PHYSICAL.md && rg -n "cert arm|ceiling|Cert WC|RELEASE-GATES" docs/ops/PROGRESS-STORAGE.md && rg -n "N-PROG-03" .planning/post-mvp/REQUIREMENTS-NEXT.md && npm test</automated>
  </verify>
  <acceptance_criteria>
    - PROGRESS-STORAGE documents v3 key, nested bests, lives stars, migrate, Select three-states
    - SOAK Select-skip note present and consistent
    - Ops note mentions cert arm smoke + single post-C2 ceiling re-run
    - Full `npm test` exits 0
  </acceptance_criteria>
  <done>Operator docs + reqs/roadmap/validation updated; full suite green.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Device UAT — Select + stars + Next + cert arm smoke</name>
  <files>.planning/post-mvp/phases/C2-level-select-stars-replay/C2-VALIDATION.md</files>
  <read_first>.planning/post-mvp/phases/C2-level-select-stars-replay/C2-VALIDATION.md, docs/ops/PROGRESS-STORAGE.md</read_first>
  <what-built>
    Level Select (lock/unlock/replay), lives-based stars on Select+Results, Results Next/Retry/Menu, required levelId + bake-safe Next, Progress v3.
  </what-built>
  <action>
Pause for human device UAT against N-LVL-02 / N-PROG-03 / N-PROG-04 and D-16 cert arm smoke. Do not change gameplay code during this checkpoint unless the user reports failures. After approval, mark Manual-Only rows in `C2-VALIDATION.md` and append `Human UAT: approved YYYY-MM-DD`. Ceiling Cert WC re-run may follow as a separate measurement session (note only — not required to approve UAT).
  </action>
  <how-to-verify>
    1. Cold start → Title → Play → Select shows 5 rows; locked rows ignore taps; Back → Title.
    2. Play unlocked uncleared (☆☆☆, no Best · 0) → win with 2+ lives → Results shows ★ mix + Retry/Next/Menu.
    3. Next advances level without blank playfield; Retry works; Menu → Title → Play → Select remount shows cleared stars+Best.
    4. Lose → Retry+Menu only (no Next); Select still uncleared if never won (no stars).
    5. Clear through to level-06 win → Results has Retry+Menu only (no disabled Next).
    6. Force-quit / relaunch — unlocks + stars durable.
    7. **Cert arm smoke (D-16):** launch with CERT harness; confirm starts Playing (skip Select) on level-03; confirm cert inject/arm still works after remount — **before** any A1 ceiling re-run.
  </how-to-verify>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; npx vitest run tests/storage.progress-v3.test.ts tests/ui/SelectScreen.test.tsx tests/ui/PlayingHost.next-bake.test.ts tests/ui/ResultOverlay.test.tsx tests/ui/GameHost.test.tsx</automated>
  </verify>
  <resume-signal>Type "approved" or list issues</resume-signal>
  <acceptance_criteria>
    - User replies `approved` OR a written defect list
    - If approved: `C2-VALIDATION.md` contains `Human UAT: approved`
  </acceptance_criteria>
  <done>Human confirmed Select/stars/Next + cert arm smoke on device.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Chrome WON/LOST → ProgressStore.recordRunEnd | Discrete cold path only; never worklet |
| levelId change → bake gate → setActive | Must not arm loop early (R-24) |
| CERT harness → Playing | Bypasses Select intentionally |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-C2-10 | Tampering / Integrity | Next / Select levelId paths | mitigate | Gate effect owns `setActive(true)`; Next mirrors toggleDevLevel; D-03 behavioral test |
| T-C2-05 | Denial of service | handleRunEnded | mitigate | Sync memory `recordRunEnd` + void persist; runEndedRef once-per-run; no await in reaction |
| T-C2-11 | Elevation of privilege | CERT force level-03 | accept | Harness measurement integrity (D-15/D-16); not player path |
| T-C2-02 | Spoofing | Client progress edits | accept | Offline single-player |
</threat_model>

<verification>
loadLevel + next-bake + GameHost + storage vitest green; required levelId; Next bake-safe; docs updated; human UAT + cert arm smoke.
</verification>

<success_criteria>
Unlock/replay/stars correct for 5 levels; bake gate holds on Next/Select start; v3 ops documented; C1-gated substrate respected earlier; phase ready for `/gsd-verify-work`.
</success_criteria>

<output>
After completion, create `.planning/post-mvp/phases/C2-level-select-stars-replay/C2-03-SUMMARY.md`
</output>
