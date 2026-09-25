---
phase: C2-level-select-stars-replay
plan: 02
type: execute
wave: 2
depends_on:
  - "C2-01"
files_modified:
  - app/_components/SelectScreen.tsx
  - app/_components/GameHost.tsx
  - app/_components/TitleScreen.tsx
  - src/runtime/overlays/ResultOverlay.tsx
  - src/runtime/GameScreen.tsx
  - tests/ui/SelectScreen.test.tsx
  - tests/ui/ResultOverlay.test.tsx
  - tests/ui/GameHost.test.tsx
autonomous: true
requirements:
  - N-LVL-02
  - N-PROG-04
must_haves:
  truths:
    - "ShellPhase is title|select|playing; Title Play → Select; Menu → Title; Playing unmounts when leaving play"
    - "CERT initial playing + SOAK title↔playing only — Select never inserted into harness paths"
    - "Select lists 5 catalog rows; mount getSnapshot(); locked ignore; uncleared ☆☆☆ no Best; cleared stars+Best"
    - "Win Results: Retry + Next? + Menu; Next omitted (not disabled) when gated off / level-06; lose: Retry+Menu only"
    - "Win Results shows stars from props; lose omits star row"
  artifacts:
    - path: "app/_components/SelectScreen.tsx"
      provides: "Full-screen Select per UI-SPEC"
    - path: "app/_components/GameHost.tsx"
      provides: "ShellPhase + activeLevelId + CERT/SOAK bypass"
      contains: "select|activeLevelId|CERT"
    - path: "src/runtime/overlays/ResultOverlay.tsx"
      provides: "optional stars + onNext; button order Retry→Next?→Menu"
    - path: "tests/ui/SelectScreen.test.tsx"
      provides: "GREEN three states + locked ignore + mount snapshot"
    - path: "tests/ui/GameHost.test.tsx"
      provides: "Title→Select→Playing→Menu→Title; CERT bypass"
  key_links:
    - from: "TitleScreen.onPlay"
      to: "shellPhase='select'"
      via: "GameHost setShellPhase"
      pattern: "setShellPhase\\('select'\\)|onPlay"
    - from: "SelectScreen mount"
      to: "ProgressStore.getSnapshot"
      via: "useEffect on mount"
      pattern: "getSnapshot"
    - from: "ResultOverlay"
      to: "onNext prop"
      via: "render Next only when function provided"
      pattern: "onNext|Play next level"
---

<objective>
Add SelectScreen + ShellPhase `'select'`, wire Title→Select→Playing with CERT/SOAK bypass, evolve ResultOverlay/GameScreen for win stars + gated Next (chrome only — PlayingHost Next/levelId plumbing is Plan 03).

Purpose: N-LVL-02 level select and N-PROG-04 Results chrome become visible and testable.
Output: SelectScreen + GameHost shell + ResultOverlay Next/stars + green UI tests.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/post-mvp/phases/C2-level-select-stars-replay/C2-CONTEXT.md
@.planning/post-mvp/phases/C2-level-select-stars-replay/C2-UI-SPEC.md
@.planning/post-mvp/phases/C2-level-select-stars-replay/C2-PATTERNS.md
@.planning/post-mvp/phases/C2-level-select-stars-replay/C2-01-SUMMARY.md
@app/_components/GameHost.tsx
@app/_components/TitleScreen.tsx
@src/runtime/overlays/ResultOverlay.tsx
@src/runtime/GameScreen.tsx
@src/services/storage/stars.ts
@src/services/storage/catalog.ts
@tests/ui/GameHost.test.tsx

<interfaces>
```typescript
// SelectScreen — NEW
type SelectScreenProps = {
  onBack: () => void;
  onChoose: (id: LevelId) => void;
  /** Optional inject for tests; default createDefaultProgressStore() */
  store?: ProgressStore;
};

// GameHost
type ShellPhase = 'title' | 'select' | 'playing';
// CERT && !SOAK → initial 'playing'; else 'title'
// Title onPlay → 'select' (D-14)
// Select onChoose(id) → setActiveLevelId(id); setShellPhase('playing')
// Playing onMenu → 'title' (D-22)
// SOAK timers: only setShellPhase('playing'|'title') — never 'select' (D-01)
// Pass levelId={CERT ? 'level-03' : activeLevelId} into PlayingHost (Plan 03 makes prop required;
//   for this plan: if PlayingHost still has internal default, pass prop forward-compatible OR keep stub in tests)

// ResultOverlay — evolve Props
type Props = {
  kind: 'win' | 'lose';
  score: number;
  best: number;
  isNewRecord: boolean;
  stars?: 1 | 2 | 3 | null; // win only
  onRetry: () => void;
  onMenu: () => void;
  onNext?: (() => void) | null; // omit control when null/undefined
};

// GameScreenProps — pass stars + onNext through to ResultOverlay
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: SelectScreen + GameHost ShellPhase</name>
  <files>app/_components/SelectScreen.tsx, app/_components/GameHost.tsx, app/_components/TitleScreen.tsx, tests/ui/SelectScreen.test.tsx, tests/ui/GameHost.test.tsx</files>
  <read_first>app/_components/TitleScreen.tsx, app/_components/GameHost.tsx, src/services/storage/catalog.ts, src/services/storage/stars.ts, .planning/post-mvp/phases/C2-level-select-stars-replay/C2-UI-SPEC.md, tests/ui/TitleScreen.test.tsx, tests/ui/GameHost.test.tsx</read_first>
  <behavior>
    - Select mounts → calls getSnapshot once (mock store); fail soft to defaults (no error modal)
    - Exactly 5 rows in PLAYABLE_LEVEL_ORDER; labels Level 01/03/04/05/06
    - Locked: "Locked" muted; accessibilityState.disabled; press does not call onChoose
    - Uncleared: ☆☆☆; no "Best ·" text
    - Cleared: ★/☆ mix + "Best · {n}"
    - Back → onBack; unlocked row → onChoose(id)
    - GameHost: Title Play → Select (Levels heading); unlocked choose → PlayingStub; Menu → Title
    - CERT harness path: initial playing, no Select hop (log / render Playing without Select)
    - SOAK code paths never setShellPhase('select')
  </behavior>
  <action>
Per **D-01, D-14, D-17…D-22** and UI-SPEC copy/tokens:

1. Create `SelectScreen.tsx` mirroring TitleScreen chrome (`#1a1a2e`, SpaceMono, safe-area). Heading **Levels**; outline **Back**; vertical list of 5. Use `selectRowState` + snapshot.bestByLevel. Locked tap ignore (D-21). a11y labels per UI-SPEC.

2. Evolve `GameHost.tsx`:
   - `ShellPhase = 'title' | 'select' | 'playing'`
   - Title `onPlay` → `'select'` (not `'playing'`)
   - Select branch between Title and Playing
   - Hold `activeLevelId` state; onChoose sets id then `'playing'`
   - CERT: keep initial `'playing'` + continue bypass Select (D-01 / D-15 site 4)
   - SOAK: only `'title'|'playing'` transitions (D-01)
   - Menu → `'title'` (D-22)
   - Playing unmounts when phase ≠ playing (existing conditional render)

3. TitleScreen chrome unchanged; only GameHost wiring of `onPlay` changes.

4. Convert SelectScreen `it.todo` → GREEN. Update GameHost test: Title→Play→Select→row→PlayingStub→Menu→Title; mock `createDefaultProgressStore` with `getSnapshot` / `getBest`. PlayingHost stub must accept optional `levelId` prop for forward-compat.

Avoid: implementing Next bake checklist / required levelId removal (Plan 03); ResultOverlay in this task; toast/preview; chapters.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; npx vitest run tests/ui/SelectScreen.test.tsx tests/ui/GameHost.test.tsx && rg -n "ShellPhase|'select'|setShellPhase\\('select'\\)" app/_components/GameHost.tsx && rg -n "getSnapshot" app/_components/SelectScreen.tsx && rg -n "setShellPhase\\('select'\\)" app/_components/GameHost.tsx | head -5</automated>
  </verify>
  <acceptance_criteria>
    - `rg "Levels|Locked|☆☆☆" app/_components/SelectScreen.tsx` matches UI-SPEC strings
    - `rg "setShellPhase\\('select'\\)" app/_components/GameHost.tsx` matches Title Play path
    - `rg "setShellPhase\\('select'\\)" app/_components/GameHost.tsx` — SOAK effect bodies must NOT contain select (manual review: soak timers only title|playing)
    - CERT initial phase still `'playing'` when CERT && !SOAK
    - SelectScreen + GameHost vitest exit 0; Select todos gone
    - No toast / preview / lock chrome beyond "Locked" text
  </acceptance_criteria>
  <done>Select + shell navigation live; CERT/SOAK bypass Select; Select UI tests green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: ResultOverlay stars + Next chrome</name>
  <files>src/runtime/overlays/ResultOverlay.tsx, src/runtime/GameScreen.tsx, tests/ui/ResultOverlay.test.tsx, tests/ui/GameScreen.test.tsx</files>
  <read_first>src/runtime/overlays/ResultOverlay.tsx, src/runtime/GameScreen.tsx, tests/ui/GameScreen.test.tsx, tests/ui/ResultOverlay.test.tsx, .planning/post-mvp/phases/C2-level-select-stars-replay/C2-UI-SPEC.md</read_first>
  <behavior>
    - Win + stars={2} → renders two ★ and one ☆ (or equivalent three-glyph line)
    - Lose → no star glyphs
    - Win + onNext function → Next button accessibilityLabel "Play next level"; order Retry → Next → Menu
    - Win + onNext null/undefined → no Next control (not disabled)
    - Lose → no Next; Retry + Menu only
  </behavior>
  <action>
Per **D-10, D-11, D-12** and UI-SPEC Results section:

1. Evolve `ResultOverlay` props: optional `stars`, optional `onNext`. Render star row on **win only**. Render **Next** filled primary only when `typeof onNext === 'function'`. Button order: Retry → Next? → Menu; gap md 16. a11y: Next = `Play next level`.

2. Evolve `GameScreen` to pass `stars` + `onNext` through (props may be optional until PlayingHost wires in Plan 03).

3. Convert ResultOverlay todos → GREEN; extend GameScreen tests for Next visibility contracts.

Avoid: PlayingHost `handleRunEnded` / Next checklist (Plan 03); Menu→Select; disabled Next button.
  </action>
  <verify>
    <automated>export PATH="/opt/homebrew/opt/node@24/bin:$PATH"; npx vitest run tests/ui/ResultOverlay.test.tsx tests/ui/GameScreen.test.tsx && rg -n "onNext|stars" src/runtime/overlays/ResultOverlay.tsx src/runtime/GameScreen.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `rg "Play next level" src/runtime/overlays/ResultOverlay.tsx` matches
    - `rg "disabled.*Next|Next.*disabled" src/runtime/overlays/ResultOverlay.tsx` returns no matches (omit, don't disable)
    - ResultOverlay + GameScreen vitest exit 0
    - Lose path has no Next role in tests
  </acceptance_criteria>
  <done>Results chrome shows stars + gated Next; tests green.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Select UI ← ProgressStore snapshot | Display-only unlock chrome; not a security boundary |
| Results UI ← props from host | Display-only; blob authority stays in store (Plan 01/03) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-C2-07 | Tampering | Select row state from snapshot | mitigate | Derive via `selectRowState`; fail soft to defaults; no error modal; remount refresh (D-20) |
| T-C2-08 | Denial of service | Select remount spam | mitigate | Mount effect read-only `getSnapshot`; no writes on Select |
| T-C2-02 | Spoofing | Client-edited unlocks | accept | Local UX lock only; offline |
| T-C2-09 | Elevation of privilege | CERT/SOAK bypass Select | accept | Intentional harness law (D-01); document in soak ops (Plan 03) |
</threat_model>

<verification>
SelectScreen + GameHost + ResultOverlay/GameScreen vitest green; ShellPhase includes select; CERT/SOAK never force Select; Next omitted when gated off.
</verification>

<success_criteria>
N-LVL-02 Select three-states + N-PROG-04 Results chrome shipped; PlayingHost bake/Next still Plan 03.
</success_criteria>

<output>
After completion, create `.planning/post-mvp/phases/C2-level-select-stars-replay/C2-02-SUMMARY.md`
</output>
