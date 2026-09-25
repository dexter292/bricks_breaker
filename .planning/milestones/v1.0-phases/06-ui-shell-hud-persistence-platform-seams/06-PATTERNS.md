# Phase 6: UI Shell, HUD, Persistence & Platform Seams - Pattern Map

**Mapped:** 2026-09-20
**Files analyzed:** 20
**Analogs found:** 15 / 20

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/_components/GameHost.tsx` | provider | event-driven | `app/_components/GameHost.tsx` (self — shell split) | exact (evolve) |
| `app/_components/PlayingHost.tsx` | provider | event-driven | `app/_components/GameHost.tsx` | exact (extract) |
| `app/_components/TitleScreen.tsx` | component | request-response | `src/runtime/overlays/CountdownOverlay.tsx` + `PauseOverlay.tsx` | role-match |
| `src/runtime/GameScreen.tsx` | component | event-driven | `src/runtime/GameScreen.tsx` (self) | exact (evolve) |
| `src/runtime/HudStrip.tsx` (or inline) | component | transform | `src/runtime/GameScreen.tsx` HUD block | exact |
| `src/runtime/overlays/PauseOverlay.tsx` | component | request-response | `src/runtime/overlays/PauseOverlay.tsx` (self) | exact (evolve) |
| `src/runtime/overlays/ResultOverlay.tsx` | component | request-response | `src/runtime/overlays/ResultOverlay.tsx` (self) | exact (evolve) |
| `src/services/storage/types.ts` | model | file-I/O | `src/core/levels/schema.ts` | role-match |
| `src/services/storage/compareBest.ts` | utility | transform | `src/runtime/freeze.ts` + `tests/runtime.freeze.test.ts` | role-match |
| `src/services/storage/memoryStore.ts` | service | CRUD | — | none |
| `src/services/storage/asyncStorageStore.ts` | service | file-I/O | — (RESEARCH Code Examples) | none |
| `src/services/platform/types.ts` | model | pub-sub | — (ARCHITECTURE External Services) | none |
| `src/services/platform/noopAds.ts` | service | event-driven | — | none |
| `src/services/platform/noopPurchases.ts` | service | event-driven | — | none |
| `src/services/platform/noopAccounts.ts` | service | event-driven | — | none |
| `src/services/platform/index.ts` | utility | transform | `src/core/index.ts` | role-match |
| `eslint.config.js` | config | — | `eslint.config.js` (self) | exact (evolve) |
| `docs/layer-contract.md` | config | — | `docs/layer-contract.md` (self) | exact (evolve) |
| `tests/storage.personal-best.test.ts` | test | transform | `tests/runtime.freeze.test.ts` | exact |
| `tests/platform.seams.test.ts` | test | event-driven | `tests/runtime.freeze.test.ts` | role-match |

**Also touch (install / unchanged entry):** `@react-native-async-storage/async-storage@2.2.0` via `npx expo install`; `app/index.tsx` stays GestureHandlerRootView + SafeAreaProvider + GameHost.

---

## Pattern Assignments

### `app/_components/GameHost.tsx` (provider, event-driven) — evolve → shell orchestrator

**Analog:** `app/_components/GameHost.tsx` (current body becomes `PlayingHost`; this file keeps only shell state)

**Imports pattern** (lines 1–23) — keep for PlayingHost; shell host needs fewer deps:

```typescript
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useKeepAwake } from 'expo-keep-awake';
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
```

**Core shell pattern** (RESEARCH Pattern 1 — apply here; hooks must not branch):

```tsx
type ShellPhase = 'title' | 'playing';

export function GameHost() {
  const [shellPhase, setShellPhase] = useState<ShellPhase>('title');
  const [best, setBest] = useState(0);

  useEffect(() => {
    if (shellPhase !== 'title') return;
    void loadPersonalBest().then(setBest); // fail soft → 0
  }, [shellPhase]);

  if (shellPhase === 'title') {
    return <TitleScreen best={best} onPlay={() => setShellPhase('playing')} />;
  }

  return <PlayingHost onMenu={() => setShellPhase('title')} />;
}
```

**End-of-run chrome bridge** (lines 152–165) — stay in PlayingHost; extend to fire persist + seams:

```typescript
const applyWorldChrome = useCallback(
  (phase: number, livesCount: number) => {
    setSimPhaseNum(phase);
    setLives(livesCount);
    if (phase === SIM.WON) {
      setResult('win');
      setActive(false);
      // Phase 6: void onRunEndedColdPath(score, 'win') — never await in reaction
    } else if (phase === SIM.LOST) {
      setResult('lose');
      setActive(false);
      // Phase 6: void onRunEndedColdPath(score, 'lose')
    }
  },
  [setActive],
);
```

**SharedValue mirror pattern** (lines 182–207) — do not change data path:

```typescript
useAnimatedReaction(
  () => scoreSv.value,
  (next, prev) => {
    if (prev === null || next !== prev) {
      runOnJS(setScore)(next);
    }
  },
);
```

**Instant Retry** (lines 233–249) — preserve; Menu is separate `onMenu` that unmounts PlayingHost:

```typescript
const onRetry = useCallback(() => {
  if (!levelReady || levelError != null) return;
  clearCountdown();
  setCountdownNumeral(null);
  setResult(null);
  // … reset chrome mirrors …
  setUiPhase('playing');
  retry();
  setActive(true);
}, [clearCountdown, retry, setActive, levelReady, levelError]);
```

**Error handling:** Font gate returns empty root (lines 255–257). Persistence fail-soft lives in storage adapters, not here.

---

### `app/_components/PlayingHost.tsx` (provider, event-driven) — NEW extract

**Analog:** Entire current `app/_components/GameHost.tsx` (move fonts, keep-awake, gestures, loop, reactions, pause FSM)

**Hooks rule:** All `useGameLoop` / `usePaddleGesture` / `useAnimatedReaction` live here so Title unmount tears them down (RESEARCH Pitfall 1).

**Composition to GameScreen** (lines 280–299) — extend props with `onMenu` + Results best fields:

```tsx
return (
  <GameScreen
    picture={picture}
    surfaceSize={surfaceSize}
    playfieldGesture={gesture}
    uiPhase={uiPhase}
    result={result}
    lives={lives}
    score={score}
    combo={combo}
    stallTier={stallTier}
    simPhaseNum={simPhaseNum}
    countdownNumeral={countdownNumeral}
    onPause={onPause}
    onResume={onResume}
    onRetry={onRetry}
    onMenu={onMenu}
    // Phase 6: best / isNewRecord for ResultOverlay
    showServeHint={showServeHint}
    levelError={levelError}
    devLevelSwitch={devLevelSwitch}
  />
);
```

**Level load path** (lines 62–65, 124–135) — keep fixed `level-01` default (discretion A3):

```typescript
const [levelId, setLevelId] = useState<LevelId>('level-01');
const loadResult = useMemo(() => loadLevelById(levelId), [levelId]);
```

---

### `app/_components/TitleScreen.tsx` (component, request-response) — NEW

**Analog:** `CountdownOverlay` (safe-area + Display 48) + `PauseOverlay` (primary filled Pressable)

**Safe-area insets** (`CountdownOverlay.tsx` lines 13–27):

```tsx
const insets = useSafeAreaInsets();
return (
  <View
    style={[
      styles.root,
      {
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      },
    ]}
  >
```

**Display typography** (`CountdownOverlay.tsx` lines 40–47) — reuse for brand name:

```typescript
numeral: {
  color: '#FFFFFF',
  fontFamily: 'SpaceMono',
  fontSize: 48,
  fontWeight: '600',
  lineHeight: 56,
  textAlign: 'center',
},
```

**Primary CTA Pressable** (`PauseOverlay.tsx` lines 30–37, 74–92):

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Start game"
  onPress={onPlay}
  style={styles.button}
>
  <Text style={styles.buttonLabel}>Play</Text>
</Pressable>
```

**Copy / colors (UI-SPEC):** root `#1a1a2e`; brand **Neon Brick Breaker**; body **Best · {n}**; Play filled `#FFFFFF` / label `#1a1a2e`; SpaceMono only; min touch 44.

**Auth/guard:** N/A. No ads/shop chrome.

---

### `src/runtime/GameScreen.tsx` (component, event-driven) — evolve

**Analog:** Self — letterbox + chrome z-order

**Playfield safe box** (lines 91–108) — **change top** so strip sits above letterbox (UI-SPEC / RESEARCH Pattern 4):

```tsx
const HUD_STRIP_CONTENT = 48;
const playfieldTop = insets.top + HUD_STRIP_CONTENT;

<View
  style={[
    styles.playfieldSafe,
    {
      top: playfieldTop, // was insets.top
      bottom: insets.bottom,
      left: insets.left,
      right: insets.right,
    },
  ]}
>
```

**Stall gate** (lines 79–84) — preserve Phase 5 fix (D-09):

```typescript
const showStall =
  stallTier > 0 &&
  result == null &&
  uiPhase === 'playing' &&
  simPhaseNum === SIM_PLAYING;
```

**Overlay wiring** (lines 170–180) — pass `onMenu` + Results score/best:

```tsx
{showPauseOverlay ? (
  <PauseOverlay onResume={onResume} onRetry={onRetry} onMenu={onMenu} />
) : null}
{showResult ? (
  <ResultOverlay
    kind={result!}
    score={score}
    best={best}
    isNewRecord={isNewRecord}
    onRetry={onRetry}
    onMenu={onMenu}
  />
) : null}
```

**Chrome z-order** (lines 199–207) — keep absolute overlay layer above Skia.

---

### `src/runtime/HudStrip.tsx` (component, transform) — NEW or inline

**Analog:** `GameScreen.tsx` HUD block (lines 112–144, 208–241)

**Metric text styles** (lines 218–224):

```typescript
lives: {
  color: '#FFFFFF',
  fontFamily: 'SpaceMono',
  fontSize: 14,
  fontWeight: '400',
  lineHeight: 20,
},
```

**Pause outline control** (lines 132–143, 225–241) — move into strip trailing slot:

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Pause game"
  onPress={onPause}
  style={styles.pauseButton}
>
  <Text style={styles.pauseLabel}>Pause</Text>
</Pressable>
```

**Strip layout (UI-SPEC):** full width; `top: insets.top`; height 48; `backgroundColor: 'rgba(18,18,31,0.8)'`; row: `Score · N` · `×C` · `Lives · L` · optional `Stall! · T` | Pause. `pointerEvents="box-none"`; Pause only interactive.

**Data path:** Props from discrete React mirrors only — never read SharedValues in render.

---

### `src/runtime/overlays/PauseOverlay.tsx` (component, request-response) — evolve

**Analog:** Self (`PauseOverlay.tsx`)

**Imports / structure** (lines 1–48) — add `onMenu` prop; append outline Menu after Retry:

```tsx
type Props = {
  onResume: () => void;
  onRetry: () => void;
  onMenu: () => void;
};
```

**Primary filled button** (lines 74–92) — Resume + Retry unchanged.

**Secondary Menu CTA** (RESEARCH Overlay Menu example + UI-SPEC):

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Return to title"
  onPress={onMenu}
  style={styles.menuButton}
>
  <Text style={styles.menuLabel}>Menu</Text>
</Pressable>
// menuButton: borderWidth 1, borderColor '#FFFFFF', backgroundColor transparent/#12121f, minHeight 44
// menuLabel: color '#FFFFFF', SpaceMono 14
```

**No confirmation dialogs** (D-03 / RUN-03).

---

### `src/runtime/overlays/ResultOverlay.tsx` (component, request-response) — evolve

**Analog:** Self (`ResultOverlay.tsx`)

**Win/Lose heading + body** (lines 29–35, 63–83) — keep; insert Score / Best / New Record between body and Retry:

```tsx
<Text style={[styles.heading, !isWin && styles.loseHeading]}>
  {isWin ? 'Win' : 'Lose'}
</Text>
<Text style={styles.body}>{isWin ? 'All clear' : 'Out of lives'}</Text>
{/* Phase 6: Score · {n}, Best · {n}, optional New Record badge (#F2CC8F) */}
```

**Props extension:**

```tsx
type Props = {
  kind: 'win' | 'lose';
  score: number;
  best: number;
  isNewRecord: boolean;
  onRetry: () => void;
  onMenu: () => void;
};
```

**CTA order (UI-SPEC):** filled Retry first, outline Menu second — copy Menu pattern from PauseOverlay.

**Destructive color** (lines 72–74): Lose heading `#E85D5D` only.

---

### `src/services/storage/types.ts` (model, file-I/O) — NEW

**Analog:** `src/core/levels/schema.ts` — versioned plain TS types, no Zod

**Versioned blob** (schema.ts lines 9–16 spirit):

```typescript
export const PERSONAL_BEST_VERSION = 1 as const;

export type PersonalBestBlob = {
  v: 1;
  bestScore: number;
  updatedAt: number;
};

export interface PersonalBestStore {
  getBest(): Promise<number>;
  setBest(bestScore: number): Promise<void>;
}
```

**Key (RESEARCH):** `@nbb/personal-best/v1`.

---

### `src/services/storage/compareBest.ts` (utility, transform) — NEW

**Analog:** Pure helpers in `src/runtime/freeze.ts` tested by `tests/runtime.freeze.test.ts`

**Core pure pattern** (RESEARCH Pattern 3):

```typescript
export function evaluatePersonalBest(
  runScore: number,
  previousBest: number,
): { best: number; isNewRecord: boolean } {
  const isNewRecord = runScore > previousBest; // strict >; never >=
  return {
    best: isNewRecord ? runScore : previousBest,
    isNewRecord,
  };
}
```

**Testing:** Node Vitest only — no RN mocks (`vitest.config.ts` includes `tests/**/*.test.ts`).

---

### `src/services/storage/memoryStore.ts` (service, CRUD) — NEW

**Analog:** None in repo. Implement `PersonalBestStore` with in-memory number for Vitest.

**Pattern to invent:** Class or factory returning `{ getBest, setBest }` matching interface; used only in tests / optional JS fallback.

---

### `src/services/storage/asyncStorageStore.ts` (service, file-I/O) — NEW

**Analog:** None. Copy RESEARCH Code Examples (lines 388–422).

**Imports:**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
```

**Fail-soft read** (UI-SPEC error state — contrast with fail-closed `validateLevel`):

```typescript
export async function readBest(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw == null) return 0;
    const parsed = JSON.parse(raw) as PersonalBestBlob;
    if (parsed?.v !== 1 || typeof parsed.bestScore !== 'number') return 0;
    if (!Number.isFinite(parsed.bestScore) || parsed.bestScore < 0) return 0;
    return Math.floor(parsed.bestScore);
  } catch {
    return 0;
  }
}
```

**Layer rule:** Only `app/` (and later `ui/`) import this — never `core/` or `runtime/` (LC-01 / LC-09).

---

### `src/services/platform/types.ts` + `noop*.ts` + `index.ts` (model/service) — NEW

**Analog:** None for no-ops. Barrel style from `src/core/index.ts`. Types from RESEARCH / ARCHITECTURE.

**Interface + no-op** (RESEARCH Platform no-op seams):

```typescript
export type RunEndedPayload = {
  score: number;
  outcome: 'win' | 'lose';
  isNewRecord?: boolean;
};

export interface AdService {
  onRunEnded(payload: RunEndedPayload): void;
}

export const noopAds: AdService = {
  onRunEnded() {
    /* no-op — ARCH-02 */
  },
};
```

**Compose barrel** (`src/core/index.ts` style):

```typescript
export function defaultPlatformServices() {
  return { ads: noopAds, purchases: noopPurchases, accounts: noopAccounts };
}
```

**Call site:** PlayingHost cold path after WON/LOST — fire-and-forget; no UI.

---

### `eslint.config.js` (config) — evolve

**Analog:** Self — `app` allow-list (lines 144–154)

**Required change:** add `'services'` to app `anyOf`:

```javascript
{
  from: { element: { type: 'app' } },
  allow: {
    to: {
      element: {
        types: {
          anyOf: ['runtime', 'render', 'input', 'ui', 'app', 'services'],
        },
      },
    },
  },
},
```

**Do not** allow `runtime` → `services` or `core` → `services` (policies already correct for services self-only).

---

### `docs/layer-contract.md` (config) — evolve

**Analog:** Self — update LC-04 row to mention `services/` cold-path wiring:

| LC-04 | `app/` → `runtime/`, `render/`, `services/` | Mount / unmount / cold I/O | Thin Expo host; AsyncStorage + platform seams from app only | ESLint boundaries |

---

### `tests/storage.personal-best.test.ts` (test, transform) — NEW

**Analog:** `tests/runtime.freeze.test.ts`

**Structure** (lines 1–44):

```typescript
import { describe, it, expect } from 'vitest';
import { evaluatePersonalBest } from '../src/services/storage/compareBest';
// + memoryStore round-trip + corrupt JSON → 0

describe('evaluatePersonalBest', () => {
  it('strict greater than sets new record', () => {
    expect(evaluatePersonalBest(100, 50)).toEqual({
      best: 100,
      isNewRecord: true,
    });
  });
  it('equal score is not a new record', () => {
    expect(evaluatePersonalBest(50, 50).isNewRecord).toBe(false);
  });
});
```

---

### `tests/platform.seams.test.ts` (test, event-driven) — NEW

**Analog:** Same Vitest Node harness as `tests/runtime.freeze.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { noopAds /* … */ } from '../src/services/platform';

describe('platform seams', () => {
  it('onRunEnded does not throw', () => {
    expect(() =>
      noopAds.onRunEnded({ score: 10, outcome: 'win', isNewRecord: true }),
    ).not.toThrow();
  });
});
```

---

## Shared Patterns

### Safe-area overlays
**Source:** `src/runtime/overlays/PauseOverlay.tsx` lines 16–27  
**Apply to:** TitleScreen, PauseOverlay, ResultOverlay, HudStrip top inset

```tsx
paddingTop: insets.top,
paddingBottom: insets.bottom,
paddingLeft: insets.left,
paddingRight: insets.right,
```

### Primary vs secondary CTAs
**Source:** `PauseOverlay.tsx` filled `#FFFFFF` / `#1a1a2e` label (lines 74–92)  
**Apply to:** Play, Resume, Retry = filled; Menu = outline `#FFFFFF` border (UI-SPEC)  
**Never:** confirmation dialogs on Retry/Menu

### SharedValue → discrete React HUD
**Source:** `app/_components/GameHost.tsx` lines 171–207  
**Apply to:** All HUD metrics; HudStrip consumes React props only

```typescript
if (prev === null || next !== prev) {
  runOnJS(setScore)(next);
}
```

### Stall chrome gate
**Source:** `src/runtime/GameScreen.tsx` lines 79–84  
**Apply to:** HudStrip Stall visibility

### Instant Retry / pause FSM
**Source:** `GameHost.tsx` `onRetry` (233–249), `onResume` countdown (216–231), `onOsPause` (97–101)  
**Apply to:** PlayingHost only — do not regress D-05

### Layer boundaries
**Source:** `eslint.config.js` + `docs/layer-contract.md`  
**Apply to:** storage/platform under `src/services/`; call sites in `app/` only; `app` allow-list must include `services`

### Fail-soft persistence vs fail-closed levels
**Source:** UI-SPEC error state + RESEARCH readBest; contrast `src/core/levels/validate.ts` fail-closed  
**Apply to:** Personal best parse/write — never block Title/Results; show **Best · 0**

### Pure Node unit tests
**Source:** `tests/runtime.freeze.test.ts` + `vitest.config.ts`  
**Apply to:** `compareBest`, memory store, platform no-ops — no jest-expo

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/services/storage/memoryStore.ts` | service | CRUD | No services layer implementations exist yet |
| `src/services/storage/asyncStorageStore.ts` | service | file-I/O | Package not installed; use RESEARCH Expo AsyncStorage 2.2.0 examples |
| `src/services/platform/types.ts` | model | pub-sub | Architecture-specified only; no code stubs |
| `src/services/platform/noopAds.ts` | service | event-driven | No platform service files yet |
| `src/services/platform/noopPurchases.ts` | service | event-driven | No platform service files yet |
| `src/services/platform/noopAccounts.ts` | service | event-driven | No platform service files yet |

Planner should use `06-RESEARCH.md` Code Examples for these six; closest *structural* guides remain `schema.ts` (types), `freeze.ts` (pure fn), `core/index.ts` (barrel).

---

## Metadata

**Analog search scope:** `app/`, `src/runtime/`, `src/runtime/overlays/`, `src/core/levels/`, `src/services/` (empty), `tests/`, `eslint.config.js`, `docs/layer-contract.md`, `vitest.config.ts`  
**Files scanned:** ~84 (`src` 56 + `app` 3 + `tests` 25)  
**Pattern extraction date:** 2026-09-20
