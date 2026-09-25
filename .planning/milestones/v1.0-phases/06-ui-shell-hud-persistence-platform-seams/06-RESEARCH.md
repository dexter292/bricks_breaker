# Phase 6: UI Shell, HUD, Persistence & Platform Seams - Research

**Researched:** 2026-09-20
**Domain:** Expo SDK 57 / React Native cold-path shell — Title↔Playing navigation, SharedValue HUD strip, AsyncStorage personal best, platform service seams
**Confidence:** HIGH

## Summary

Phase 6 wraps the already-playable loop in a real app shell without touching the hot path. The existing stack already has SharedValue → `useAnimatedReaction` → discrete React mirrors for Score/Combo/Lives/Stall, Pause/Result overlays with instant Retry, safe-area letterboxing, and AppState auto-pause. What is missing is: cold-start **Title** (not Playing), **Menu → Title**, a compact **top HUD strip** that sits *above* the letterboxed field, **AsyncStorage personal best** at end-of-run, and **code-only** `AdService` / `PurchaseService` / `AccountService` stubs with real `onRunEnded` call sites.

**Primary recommendation:** Keep a single Expo Router route (`app/index.tsx`); drive Title vs Playing with local shell state in `GameHost` (conditionally mount a `PlayingHost` that owns game hooks). Persist best via `@react-native-async-storage/async-storage@2.2.0` behind a `services/storage` interface (memory adapter for Vitest). Extend overlays + HUD per `06-UI-SPEC.md`. Wire `services/platform` no-ops from the WON/LOST cold path. Update ESLint so `app` may import `services`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### App shell & entry flow (RUN-03 adjacent)
- **D-01:** Cold start lands on a **Title** screen: product name, **Play**, and **Personal Best**.
- **D-02:** **Play** starts (or restarts into) the level; gameplay is not the cold-start default.
- **D-03:** **Pause** overlay: Resume, Retry (instant, no confirm), and **Menu** → Title.
- **D-04:** **Results** (Win/Lose): prominent **Retry** (instant, no confirm), secondary **Menu** → Title.
- **D-05:** Preserve Phase 3 pause/OS rules: AppState auto-pause, accumulator reset, tap Resume then 3s countdown — do not regress.

#### HUD polish (SC-2 / SharedValue mirrors)
- **D-06:** Replace Phase 5 free-floating chrome with a **compact top safe-area strip** (semi-transparent background).
- **D-07:** Strip shows **Score**, **Combo**, **Lives**, and **Stall** status when active — must **not** obstruct the playfield (no center overlays for routine HUD).
- **D-08:** HUD values continue via **discrete SharedValue mirrors** + `useAnimatedReaction` / JS mirrors — **never** React state updates every physics frame.
- **D-09:** Stall chrome remains gated to active play (Phase 5 review fix) — do not show Stall! while docked/paused/results unless explicitly useful; prefer hide when not PLAYING.

#### Results & high score (RUN-04)
- **D-10:** At **end of every run** (Win **or** Lose), compare run score to stored personal best; if greater, update best **asynchronously**.
- **D-11:** Results screen shows: **Score**, **Best**, **New Record** badge when this run set a new best, large **Retry**, secondary **Menu**.
- **D-12:** Title screen displays current **Personal Best** (read from persistence; refresh when returning to Title).
- **D-13:** Persistence must **not** block the sim/render loop and must **not** introduce per-frame React writes.

#### Layout & platform (PLT-02)
- **D-14:** Keep existing **playfield aspect-ratio letterboxing**; do not stretch the virtual field.
- **D-15:** HUD strip and all overlays (Title, Pause, Results) lay out inside **safe-area insets** on notched iPhone and Android.
- **D-16:** Target phone sizes: layout must remain usable across the project’s intended phone range (same spirit as Phase 3 overlays — centered panels, min touch targets ≥44).

#### Monetization / account seams (ARCH-02)
- **D-17:** Add **internal interfaces + no-op implementations** for future ads, IAP, and accounts; wire **real call sites** (at minimum an end-of-run hook such as `onRunEnded`).
- **D-18:** **No visible UI** for ads, shop, rewarded continue, or sign-in in Phase 6 — seams are code-only.
- **D-19:** MVP remains fully playable **offline / airplane mode** with zero network dependency for these stubs.

### Claude's Discretion
- Exact Title / HUD / Results visual styling (fonts, spacing, colors) within “clear, compact, non-obstructive neon-arcade-adjacent” — `/gsd-ui-phase 6` should lock the UI-SPEC
- Exact AsyncStorage key schema and migration strategy (single key vs versioned blob)
- Exact service interface method names beyond the seam intent
- Whether Title “Play” loads last level vs fixed Phase 4/8 level pipeline entry (must use existing level load path)

### Deferred Ideas (OUT OF SCOPE)
- Neon VFX / particles / destruction / screen shake polish — Phase 7
- SFX / audio settings — Phase 7
- Real ads, IAP, accounts, cloud sync — post-MVP
- Showpiece level authoring & store compliance — Phase 8
- Hardware 60 FPS certification — Phase 8
- Visible shop / rewarded-continue / login screens — explicitly out of Phase 6
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RUN-03 | Player can instantly retry from lose or pause without a confirmation dialog | Instant Retry already exists in `PauseOverlay` / `ResultOverlay` / `GameHost.onRetry`. Phase 6 adds **Menu** and Title flow; keep Retry Pressable-only with no confirm dialogs (D-03, D-04, UI-SPEC). |
| RUN-04 | Local high score persists across app kills (offline, no account) | `@react-native-async-storage/async-storage@2.2.0` via Expo pin; `services/storage` read/write at end-of-run + Title refresh; pure compare helper unit-tested (D-10…D-13). |
| PLT-02 | Playfield layout is responsive with safe-area handling on iOS and Android | Shrink playfieldSafe top by HUD strip height so strip sits *above* letterbox; overlays already use `useSafeAreaInsets`; Title same pattern (D-14…D-16, UI-SPEC). |
| ARCH-02 | Seams for future ads/IAP/accounts without implementing them; MVP fully playable offline | `services/platform` interfaces + no-op stubs; call `onRunEnded` from WON/LOST cold path; no UI, no network (D-17…D-19). |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Title / Menu / Results chrome | Browser / Client (React Native shell) | — | Cold-path React only; never drives physics |
| Shell navigation (Title ↔ Playing) | Browser / Client (`GameHost` local state) | — | Mode switch, not deep-link destination; avoid remounting Expo Router stack |
| HUD strip metrics | Browser / Client (discrete mirrors) | Runtime (SharedValue writes) | Loop writes SharedValues; React updates only on change |
| Playfield letterbox + camera | Runtime + Render | Browser / Client (safe box layout) | Physics stays 360×640; shell only sizes the safe box |
| Personal best persistence | Services (`storage`) | Browser / Client (call sites) | Async I/O off hot path; app/ui invokes at end-of-run / Title enter |
| Platform ads/IAP/accounts seams | Services (`platform`) | Browser / Client (call sites) | Interfaces + no-ops; call sites only |
| Pause / AppState / countdown | Runtime + Browser / Client | — | Preserve Phase 3 invariants; do not move into core |
| Score / lives / win-lose rules | core (already done) | — | Phase 6 must not reimplement rules |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo` | `~57.0.24` (project) | SDK host | Locked project stack `[VERIFIED: package.json]` |
| `expo-router` | `~57.0.22` | Single-route entry only | Already hosts `app/index.tsx`; do **not** add Title as a second route `[VERIFIED: package.json]` |
| `react-native-safe-area-context` | `~5.7.0` | Insets for Title / HUD / overlays | Already wired; SDK pin `[VERIFIED: package.json + bundledNativeModules]` |
| `react-native-reanimated` | `4.5.1` | SharedValue mirrors + `useAnimatedReaction` | Existing HUD bridge; keep pattern `[VERIFIED: package.json]` |
| `@react-native-async-storage/async-storage` | **`2.2.0`** (Expo SDK 57 pin) | Local personal best | Expo docs + `bundledNativeModules.json`; write-once-per-run so sync MMKV is unnecessary `[VERIFIED: expo bundledNativeModules + docs.expo.dev/versions/v57.0.0/sdk/async-storage/]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-font` / SpaceMono | existing | Title / HUD / overlay typography | Already loaded in `GameHost` |
| `expo-keep-awake` | `~57.0.2` | Keep awake during play | Already in `GameHost`; Title may leave it mounted (harmless) or move into `PlayingHost` |
| Vitest | `5.0.1` | Unit tests for pure storage/compare + platform stubs | Existing Node harness — no jest-expo required for Phase 6 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AsyncStorage 2.2.0 | AsyncStorage 3.x / `createAsyncStorage` | **Reject for Expo managed** — 3.x needs custom Maven/plugin; Expo pin is 2.2.0 `[CITED: github.com/react-native-async-storage/async-storage/issues/1263]` |
| AsyncStorage | `expo-secure-store` | Wrong tool — encryption/keychain for secrets; high scores are unsigned local prefs; SecureStore has size/compliance quirks `[CITED: docs.expo.dev/versions/v57.0.0/sdk/securestore/ + docs.expo.dev/develop/user-interface/store-data/]` |
| AsyncStorage | `react-native-mmkv` | Faster sync API, but unpinned native module; write frequency is once per run — speed irrelevant `[CITED: .planning/research/STACK.md]` |
| Local shell state | Expo Router `/title` + `/play` routes | Remounts Skia/worklet host; complicates AppState freeze ownership; overkill for two modes `[ASSUMED: project has single-route game shell; router nesting adds no product value]` |

**Installation:**

```bash
npx expo install @react-native-async-storage/async-storage
# Expect @react-native-async-storage/async-storage@2.2.0 (SDK 57 pin)
```

**Version verification:**
- Expo `bundledNativeModules.json`: `@react-native-async-storage/async-storage` → `2.2.0` `[VERIFIED: node_modules/expo/bundledNativeModules.json]`
- npm `latest` is `3.1.1` — **do not install latest**; use `expo install` `[VERIFIED: npm view]`
- Package is **not yet installed** in this repo — Wave 0 / Plan 01 must add it `[VERIFIED: node_modules absent]`

**2.2.0 import API (classic default export — not v3 `createAsyncStorage`):**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem(KEY, JSON.stringify(blob));
const raw = await AsyncStorage.getItem(KEY);
```

`[CITED: docs.expo.dev/develop/user-interface/store-data/ + STACK.md + AsyncStorage 2.x default export pattern]`

## Architecture Patterns

### System Architecture Diagram

```
Cold start
   │
   ▼
┌──────────────────────────────────────────────────────────┐
│ GameHost (app/) — shellPhase: title | playing            │
│  • Title: loadBest() → TitleScreen                       │
│  • Play → mount PlayingHost                              │
│  • Menu ← Pause/Results → unmount PlayingHost → Title    │
└─────────────┬────────────────────────────▲───────────────┘
              │ mount                      │ Menu
              ▼                            │
┌──────────────────────────────────────────────────────────┐
│ PlayingHost (app/ or runtime/)                           │
│  useGameLoop SharedValues ──change──► useAnimatedReaction│
│        │                              runOnJS(setScore…) │
│        │                                     │           │
│        ▼                                     ▼           │
│  GameCanvas (Skia)              HudStrip + Overlays      │
│  letterbox in safe box          (safe-area; strip above) │
│        │                                                 │
│        │ WON / LOST (discrete)                           │
│        ▼                                                 │
│  onRunEnded cold path:                                   │
│    1. compareAndUpdateBest(score) → AsyncStorage (async) │
│    2. platform.ads|iap|account.onRunEnded?.(payload)     │
│    3. show ResultOverlay (Score, Best, New Record?)      │
└──────────────────────────────────────────────────────────┘

services/
  storage/   PersonalBestStore (interface + asyncStorage + memory)
  platform/  AdService | PurchaseService | AccountService (no-op)
```

### Recommended Project Structure

```
app/
├── index.tsx                 # GestureHandlerRootView + SafeAreaProvider (unchanged)
├── _layout.tsx               # Stack, portrait lock (unchanged)
└── _components/
    ├── GameHost.tsx          # shellPhase title|playing; Menu/Play wiring
    ├── TitleScreen.tsx       # NEW — brand, Best · N, Play
    └── PlayingHost.tsx       # NEW (or keep inline) — fonts, loop, chrome, end-of-run

src/runtime/
├── GameScreen.tsx            # evolve: HudStrip layout; pass onMenu
├── overlays/
│   ├── PauseOverlay.tsx      # + Menu (outline)
│   └── ResultOverlay.tsx     # + Score/Best/New Record + Menu
└── …

src/services/                 # NEW — eslint type already exists
├── storage/
│   ├── types.ts              # PersonalBestBlob, PersonalBestStore
│   ├── compareBest.ts        # pure: isNewRecord / nextBest
│   ├── memoryStore.ts        # Vitest
│   └── asyncStorageStore.ts  # device adapter
└── platform/
    ├── types.ts              # AdService, PurchaseService, AccountService, RunEndedPayload
    ├── noopAds.ts
    ├── noopPurchases.ts
    ├── noopAccounts.ts
    └── index.ts              # compose defaultPlatformServices()
```

**ESLint gap (must fix in this phase):** `app` may currently import `runtime|render|input|ui|app` but **not** `services`. Add `services` to the `app` allow-list. Do **not** allow `runtime` → `services` or `core` → `services` (LC-01 / LC-09). `[VERIFIED: eslint.config.js]`

### Pattern 1: Local shell state (not Expo Router screens)

**What:** `shellPhase: 'title' | 'playing'` in `GameHost`. Conditionally render `TitleScreen` vs `PlayingHost`.

**When to use:** Always for Phase 6 Title↔Play. Product has one destination; Title is a mode.

**Why not router routes:** Mounting a second route remounts the Skia/worklet tree and splits AppState ownership across screens. Existing app is already a single Stack screen with no headers. `[ASSUMED: remount cost / freeze ownership — recommend validating with one mount-unmount soak in UAT]`

**Example:**

```tsx
// app/_components/GameHost.tsx — shell orchestration
type ShellPhase = 'title' | 'playing';

export function GameHost() {
  const [shellPhase, setShellPhase] = useState<ShellPhase>('title');
  const [best, setBest] = useState(0);

  useEffect(() => {
    if (shellPhase !== 'title') return;
    void loadPersonalBest().then(setBest); // fail soft → 0
  }, [shellPhase]);

  if (shellPhase === 'title') {
    return (
      <TitleScreen
        best={best}
        onPlay={() => setShellPhase('playing')}
      />
    );
  }

  return (
    <PlayingHost
      onMenu={() => setShellPhase('title')}
      // levelId: keep existing 'level-01' default (discretion: fixed pipeline entry)
    />
  );
}
```

**Hooks rule:** Do not call `useGameLoop` / gesture hooks inside a branch of the same component — extract `PlayingHost` so Title unmount tears down the loop cleanly.

### Pattern 2: SharedValue HUD mirrors (preserve; restyle only)

**What:** Loop writes `scoreOut` / `comboOut` / `livesOut` / `stallTierOut`; host uses `useAnimatedReaction` + `runOnJS` only when value changes.

**When to use:** All HUD metrics (D-08). Already implemented in `GameHost` — Phase 6 only changes layout chrome to `HudStrip`, not the data path.

**Anti-pattern:** `setState` inside `useFrameCallback` or reading SharedValues every React render for live scores.

### Pattern 3: End-of-run cold path (persist + seams + Results)

**What:** On discrete transition to WON/LOST (existing `applyWorldChrome`), fire async best update + `onRunEnded`, then render Results with Score / Best / New Record.

**Example:**

```typescript
// Pure — unit test in Node (no AsyncStorage)
export function evaluatePersonalBest(
  runScore: number,
  previousBest: number,
): { best: number; isNewRecord: boolean } {
  const isNewRecord = runScore > previousBest;
  return {
    best: isNewRecord ? runScore : previousBest,
    isNewRecord,
  };
}

// Cold path — never await inside the frame callback
async function onRunEnded(score: number, outcome: 'win' | 'lose') {
  const previous = await store.getBest().catch(() => 0);
  const { best, isNewRecord } = evaluatePersonalBest(score, previous);
  if (isNewRecord) {
    void store.setBest(best).catch(() => {}); // fail soft
  }
  platform.ads.onRunEnded?.({ score, outcome, isNewRecord });
  platform.purchases.onRunEnded?.({ score, outcome });
  platform.accounts.onRunEnded?.({ score, outcome });
  return { best, isNewRecord };
}
```

### Pattern 4: HUD strip above letterbox (PLT-02)

**What:** Today `playfieldSafe.top = insets.top` and HUD floats *over* the field (`GameScreen.tsx`). UI-SPEC requires strip **above** the letterboxed field so brick rows are not covered.

**Change:**

```tsx
const HUD_STRIP_CONTENT = 48; // UI-SPEC
const stripTop = insets.top;
const playfieldTop = insets.top + HUD_STRIP_CONTENT;

// playfieldSafe: { top: playfieldTop, bottom: insets.bottom, left, right }
// HudStrip: absolute full-width, top: stripTop, height: HUD_STRIP_CONTENT,
//   backgroundColor: 'rgba(18,18,31,0.8)' // #12121f @ 80%
```

Camera/letterbox continues to scale 360∶640 into whatever `surfaceSize` the canvas reports — shrinking the safe box is correct and expected.

### Anti-Patterns to Avoid

- **Expo Router Title route** — remounts game host; unnecessary for two modes
- **`expo-secure-store` for high scores** — secrets API; compliance noise; wrong persistence semantics
- **AsyncStorage 3.x** — breaks Expo managed without custom plugins
- **Per-frame React HUD** — regresses PHYS-06 / LC-11
- **Opaque HUD covering bricks** — fails D-07 / SC-2
- **Visible ads/IAP/login UI** — forbidden D-18
- **`await` persistence inside worklet / frame callback** — blocks hot path
- **Confirmation dialogs on Retry/Menu** — violates RUN-03 / D-03 / D-04
- **Letting `core/` or `runtime/` import AsyncStorage** — layer contract violation

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Key-value persistence | Custom FileSystem JSON writer | AsyncStorage 2.2.0 | SDK-pinned, async, sufficient for one integer `[CITED: Expo store-data docs]` |
| Safe-area insets | Manual status-bar constants | `useSafeAreaInsets` | Already in overlays; notch/home-indicator variance `[VERIFIED: existing overlays]` |
| Encrypted high score | Custom crypto / SecureStore | Plain AsyncStorage | MVP scores are local-only unsigned; PITFALLS accepts this `[CITED: PITFALLS.md]` |
| Navigation stack for Title | Custom navigator / deep links | Local `shellPhase` state | Two modes; no URL/deep-link requirement |
| Platform monetization | Real ad/IAP SDKs | Interface + no-op | ARCH-02 / D-17…D-19 |

**Key insight:** Phase 6 is almost entirely cold-path composition. The expensive architecture (SharedValue mirrors, letterbox, freeze) already exists — extend chrome and add storage/platform folders without inventing new hot-path mechanisms.

## Common Pitfalls

### Pitfall 1: Conditional hooks in GameHost
**What goes wrong:** `if (title) return …; useGameLoop(…)` violates Rules of Hooks or keeps the loop alive on Title.
**Why it happens:** Adding Title as a branch in the same component that owns the loop.
**How to avoid:** Extract `PlayingHost`; Title unmounts it.
**Warning signs:** Worklet still ticking on Title; AppState pause while on Title.

### Pitfall 2: HUD still overlapping brick rows
**What goes wrong:** Restyle strip but leave `playfieldSafe.top = insets.top`.
**Why it happens:** Current Phase 5 chrome floats over the field.
**How to avoid:** Push playfield top down by strip content height (48) per UI-SPEC.
**Warning signs:** Top brick row clipped or obscured on notched devices.

### Pitfall 3: Blocking persistence on the hot path
**What goes wrong:** `await AsyncStorage.setItem` inside frame callback / before showing Results.
**Why it happens:** Treating storage as synchronous game logic.
**How to avoid:** Fire-and-forget after discrete WON/LOST; Results can show optimistic `evaluatePersonalBest` from in-memory previous + run score; Title re-reads on enter.
**Warning signs:** Frame hitches at win/lose; ESLint/runtime imports of AsyncStorage in `core/`.

### Pitfall 4: New Record off-by-one / stale Best
**What goes wrong:** Badge uses `>=` instead of `>`; Results Best shows pre-update value; Title shows stale after Menu.
**Why it happens:** Async write races Title refresh.
**How to avoid:** Strict `>`; compute display Best synchronously via `evaluatePersonalBest`; refresh Title on every `shellPhase === 'title'` entry; fail soft to 0.
**Warning signs:** Badge on equal score; Title Best behind last run.

### Pitfall 5: Regressing pause/OS resume
**What goes wrong:** Menu/Title changes break AppState auto-pause or auto-resume without countdown.
**Why it happens:** Moving freeze ownership or unmounting mid-pause incorrectly.
**How to avoid:** Keep AppState wiring inside `PlayingHost`/`useGameLoop`; Menu → Title unmounts playing (OK); never auto-`setActive(true)` on foreground (D-05).
**Warning signs:** Resume without countdown; physics jump after background.

### Pitfall 6: Installing AsyncStorage 3.x
**What goes wrong:** EAS/native build failures or Expo version warnings.
**Why it happens:** `npm install` latest instead of `expo install`.
**How to avoid:** `npx expo install @react-native-async-storage/async-storage` only; assert `2.2.0` in lockfile.
**Warning signs:** Peer/plugin warnings about local Maven repo.

### Pitfall 7: ESLint boundaries block services
**What goes wrong:** `app` cannot import `src/services/**` — CI lint red.
**Why it happens:** Boundaries pre-declared services but never allowed from app.
**How to avoid:** First implementation task: add `services` to app allow-list; update `docs/layer-contract.md` note (LC-04 cold-path wiring).
**Warning signs:** `boundaries/dependencies` errors on first import.

### Pitfall 8: Visible monetization placeholders
**What goes wrong:** Banner View “Ad here” or disabled Shop button ships.
**Why it happens:** Interpreting “seams” as UI placeholders.
**How to avoid:** Interfaces + call sites only (D-18); no components in inventory.
**Warning signs:** Any Pressable labeled Shop / Watch Ad / Sign In.

## Code Examples

### AsyncStorage personal-best adapter (device)

```typescript
// Source pattern: Expo AsyncStorage + JSON blob [CITED: docs.expo.dev store-data + AsyncStorage FAQ]
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@nbb/personal-best/v1';

export type PersonalBestBlob = {
  v: 1;
  bestScore: number;
  updatedAt: number; // ms epoch, informational only
};

export async function readBest(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw == null) return 0;
    const parsed = JSON.parse(raw) as PersonalBestBlob;
    if (parsed?.v !== 1 || typeof parsed.bestScore !== 'number') return 0;
    if (!Number.isFinite(parsed.bestScore) || parsed.bestScore < 0) return 0;
    return Math.floor(parsed.bestScore);
  } catch {
    return 0; // UI-SPEC: fail soft → Best · 0
  }
}

export async function writeBest(bestScore: number): Promise<void> {
  const blob: PersonalBestBlob = {
    v: 1,
    bestScore: Math.floor(bestScore),
    updatedAt: Date.now(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(blob));
}
```

**Schema recommendation (Claude discretion):** single versioned JSON blob key `@nbb/personal-best/v1` — easy future migrations without multi-key sprawl.

### Platform no-op seams

```typescript
// Aligns with ARCHITECTURE.md External Services table
export type RunEndedPayload = {
  score: number;
  outcome: 'win' | 'lose';
  isNewRecord?: boolean;
};

export interface AdService {
  onRunEnded(payload: RunEndedPayload): void;
  // future: showRewardedContinue(): Promise<'rewarded' | 'dismissed' | 'unavailable'>
}

export interface PurchaseService {
  onRunEnded(payload: RunEndedPayload): void;
}

export interface AccountService {
  onRunEnded(payload: RunEndedPayload): void;
}

export const noopAds: AdService = {
  onRunEnded() {
    /* no-op — ARCH-02 */
  },
};
// similarly noopPurchases, noopAccounts
```

### Overlay Menu secondary CTA (UI-SPEC)

```tsx
// Menu: outline, not filled accent — keeps Retry/Play dominant
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Return to title"
  onPress={onMenu}
  style={styles.menuButton}
>
  <Text style={styles.menuLabel}>Menu</Text>
</Pressable>

// styles.menuButton: borderWidth 1, borderColor '#FFFFFF',
//   backgroundColor 'transparent' or '#12121f', minHeight 44
// styles.menuLabel: color '#FFFFFF', SpaceMono 14
```

### Stall gate (preserve Phase 5 fix)

```tsx
const showStall =
  stallTier > 0 &&
  result == null &&
  uiPhase === 'playing' &&
  simPhaseNum === SIM_PLAYING; // hide docked/paused/countdown/results
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cold start → Playing | Cold start → Title | Phase 6 | Real app shell (D-01, D-02) |
| Free-floating HUD column over field | Top semi-transparent strip above letterbox | Phase 6 | PLT-02 / D-06–D-07 |
| Results: Win/Lose + Retry only | + Score, Best, New Record, Menu | Phase 6 | RUN-04 / D-11 |
| No persistence | AsyncStorage personal best | Phase 6 | Survives app kill |
| No platform seams | Interface + no-op + `onRunEnded` | Phase 6 | ARCH-02 |
| AsyncStorage 3.x ecosystem | Expo-managed stays on **2.2.0** | SDK 54–57 | Must `expo install`, not npm latest |

**Deprecated/outdated:**
- Using `expo-secure-store` for non-secret prefs — Expo store-data docs reserve it for tokens/secrets
- `createAsyncStorage` factory — AsyncStorage 3.x API; not the Expo 57 pin
- Per-frame React HUD — forbidden since Phase 1/2 architecture

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Local `shellPhase` is preferable to Expo Router Title/Play routes for freeze ownership and Skia remount cost | Architecture Patterns | If product later needs deep links to play, add routes then — Phase 6 scope still fine |
| A2 | Conditionally unmounting `PlayingHost` on Menu is the intended teardown (vs keeping loop frozen on Title) | Pattern 1 | Mount-unmount leaks would surface in Phase 8 soak — document UAT check |
| A3 | Title Play uses fixed `level-01` (existing default) rather than “last played” | Discretion | Trivial to switch `levelId` state later |
| A4 | Optimistic Results Best from in-memory evaluate is OK before AsyncStorage write completes | Pitfall 4 | Extremely rare write failure → Title shows 0 until next successful write (UI-SPEC fail soft) |

**If empty:** N/A — four assumed items above need no user lock; they match Claude's Discretion + UI-SPEC fail-soft.

## Open Questions (RESOLVED)

1. **Should Menu unmount the game host or keep it frozen under Title?** — **RESOLVED**
   - What we know: Unmount clears worklets/AppState listeners; remount on Play reloads level via existing `retry`/`loadLevelById` path.
   - **Lock (Q1):** Unmount `PlayingHost` on Menu (do **not** freeze-under-Title). Matches Pattern 1 / A2 and Plan 03 shell.
   - Rationale: Cleaner Title; tears down worklets/AppState; Play remounts fresh.

2. **In-memory cache of best inside PlayingHost for Results?** — **RESOLVED**
   - What we know: UI-SPEC wants Score/Best/New Record on Results without blocking.
   - **Lock (Q2):** Preload `previousBest` on Play / `PlayingHost` mount; use it for `evaluatePersonalBest`; Title still re-reads from storage on Menu return.
   - Rationale: Optimistic Results without awaiting AsyncStorage on the cold path (Plan 05).

3. **Does RUN-03 require any code change beyond Menu + Title?** — **RESOLVED**
   - What we know: Instant Retry already shipped in Phase 3/5.
   - **Lock (Q3):** RUN-03 = instant Retry + Menu→Title; preserve Phase 3 pause/OS rules (D-05); **no** confirmation dialogs on Retry or Menu.
   - Rationale: Treat as regression + Menu path — Pressable-only; no new dialogs (Plans 03/05).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | Vitest / tooling | ✓ | v25.6.0 (engines ask `>=24 <25` — note mismatch) | Use Node 24 for CI if engines enforced |
| npm | Install AsyncStorage | ✓ | 11.8.0 | — |
| Expo SDK 57 | App runtime | ✓ | ~57.0.24 | — |
| `@react-native-async-storage/async-storage` | RUN-04 | ✗ not installed | pin `2.2.0` | Install via `npx expo install …` |
| `react-native-safe-area-context` | PLT-02 | ✓ | ~5.7.0 | — |
| `expo-secure-store` | — | N/A (not recommended) | — | Do not install for this phase |
| Physical notched device | PLT-02 UAT | unknown | — | Simulator + safe-area insets; real device in Phase 8 |

**Missing dependencies with no fallback:**
- AsyncStorage package (must install before persistence tasks)

**Missing dependencies with fallback:**
- Hardware notch UAT — simulator insets + manual checklist until Phase 8 devices

**Step 2.6 note:** Node engine field says `>=24 <25` but environment reports v25.6.0 — existing project state; not introduced by Phase 6. Flag only if `npm`/`engines` hooks fail during install.

## Validation Architecture

> `workflow.nyquist_validation` is **true** in `.planning/config.json` — section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `5.0.1` (Node environment) |
| Config file | `vitest.config.ts` — includes `src/core/**/*.test.ts`, `tests/**/*.test.ts` |
| Quick run command | `npm test -- tests/storage.personal-best.test.ts tests/platform.seams.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RUN-03 | Retry from Pause/Results has no confirmation; Menu returns to Title | manual UAT + shallow unit of shell reducer if extracted | Manual checklist; optional `tests/shell.navigation.test.ts` for pure state transitions | ❌ Wave 0 |
| RUN-04 | `evaluatePersonalBest` strict `>`; schema parse fail → 0; memory store round-trip | unit | `npm test -- tests/storage.personal-best.test.ts` | ❌ Wave 0 |
| RUN-04 | Best survives app kill | manual / device | Force-quit → relaunch → Title Best | ❌ manual-only (justified: needs AsyncStorage native) |
| PLT-02 | Playfield top below strip; overlays inside insets | manual UAT | Visual on notched sim + Android | ❌ manual-only |
| ARCH-02 | No-op services callable; `onRunEnded` does not throw | unit | `npm test -- tests/platform.seams.test.ts` | ❌ Wave 0 |
| D-08 / SC-2 | No new per-frame setState path | code review + existing mirror tests | `npm test` (no regression) | ✅ existing GameHost pattern |
| D-09 | Stall chrome gate | unit or UI pure helper | Extend existing stall chrome condition test if extracted | ⚠️ logic exists in GameScreen — extract optional |

### Sampling Rate

- **Per task commit:** `npm test -- tests/storage.personal-best.test.ts tests/platform.seams.test.ts` (or full `npm test` if fast)
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + manual UAT checklist (Title cold start, Menu, Best after kill, safe-area strip, airplane mode) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/storage.personal-best.test.ts` — covers RUN-04 pure compare + memory store + corrupt JSON → 0
- [ ] `tests/platform.seams.test.ts` — covers ARCH-02 no-op `onRunEnded` invocable
- [ ] Optional `tests/shell.navigation.test.ts` — pure `shellPhase` transitions Title→Playing→Title if reducer extracted
- [ ] Install: `npx expo install @react-native-async-storage/async-storage` (@2.2.0)
- [ ] ESLint: allow `app` → `services`
- [ ] **Do not** add jest-expo / React Native Testing Library unless a pure reducer is insufficient — project Vitest is Node-only by design `[VERIFIED: vitest.config.ts + STACK.md]`

**Manual-only (justified):**
- Force-quit persistence survival
- Notched safe-area visual layout
- Airplane-mode full loop
- Instant Retry / Menu UX (Pressable, no dialog)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No accounts in Phase 6 (stub only) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Validate/parse AsyncStorage JSON; reject non-finite / negative scores; fail soft to 0 |
| V6 Cryptography | no | Do **not** encrypt local high scores; SecureStore not used |

### Known Threat Patterns for Expo RN game shell

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Tampered local high score | Tampering | Accept for MVP (PITFALLS); never trust client if cloud sync added later |
| Corrupted storage blob | Denial of service / Integrity | try/catch + schema version check → Best · 0 |
| Accidental network / SDK pull-in | Information disclosure | No-op stubs only; no analytics/ad SDKs (PITFALLS) |
| Injecting storage into `core/` | Elevation of privilege (arch) | ESLint boundaries; services only from app/ui |

## Project Constraints (from .cursor/rules/)

| Directive | Source | Planning impact |
|-----------|--------|-----------------|
| Expo HAS CHANGED — use docs at `https://docs.expo.dev/versions/v57.0.0/` | `AGENTS.md` / workspace rule | All Expo APIs researched against v57 docs |
| Tech: RN + TS + Expo + EAS + Skia + custom physics + fixed timestep | `.cursor/rules/gsd.md` ← PROJECT.md | No stack substitutions |
| Offline MVP; no unnecessary backend | gsd.md | Persistence local-only; seams offline |
| Monetization deferred; keep integration points clean | gsd.md | Interfaces + no-ops only |
| No React state every physics frame | PROJECT / ARCH | Preserve SharedValue mirrors |
| AsyncStorage listed for local high scores | STACK.md in gsd.md | Prefer AsyncStorage over MMKV/SecureStore |

## Sources

### Primary (HIGH confidence)

- [docs.expo.dev/versions/v57.0.0/sdk/async-storage/](https://docs.expo.dev/versions/v57.0.0/sdk/async-storage/) — install via `expo install`
- [docs.expo.dev/develop/user-interface/store-data/](https://docs.expo.dev/develop/user-interface/store-data/) — AsyncStorage vs SecureStore roles
- [docs.expo.dev/versions/v57.0.0/sdk/securestore/](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/) — why not for high scores
- `node_modules/expo/bundledNativeModules.json` — AsyncStorage pin `2.2.0`
- `package.json`, `eslint.config.js`, `vitest.config.ts`, `docs/layer-contract.md` — project reality
- `app/_components/GameHost.tsx`, `src/runtime/GameScreen.tsx`, overlays — existing patterns
- `06-CONTEXT.md`, `06-UI-SPEC.md` — locked decisions + visual contract
- `.planning/research/ARCHITECTURE.md`, `STACK.md`, `PITFALLS.md`, `SUMMARY.md` — seams / storage / HUD model

### Secondary (MEDIUM confidence)

- [github.com/react-native-async-storage/async-storage/issues/1263](https://github.com/react-native-async-storage/async-storage/issues/1263) — stay on 2.2.0 for Expo managed
- Context7 `/react-native-async-storage/async-storage` — API snippets (note: some docs show v3 `createAsyncStorage`; pin remains classic default export for 2.2.0)

### Tertiary (LOW confidence)

- Assumed Skia remount cost of Expo Router dual-route approach (A1) — validate only if someone proposes router screens

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — Expo pin + docs + package.json verified
- Architecture: **HIGH** — aligns with existing GameHost/SharedValue/letterbox; ESLint gap verified
- Pitfalls: **HIGH** — from project PITFALLS + observed code layout issues

**Research date:** 2026-09-20
**Valid until:** 2026-10-20 (30 days; AsyncStorage Expo pin may move with SDK 58)
