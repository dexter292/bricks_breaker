# Phase 12: Daily Challenge - Pattern Map

**Mapped:** 2026-09-27
**Files analyzed:** 20 (10 new, 10 modified)
**Analogs found:** 20 / 20

Every path below was gated with `git ls-files -- <path>` this session; all existing analogs
are tracked source, none is a gitignored mirror. Every line number was re-derived against the
current working tree today (`4033457` + `.planning/` edits) — none is inherited from
`12-CONTEXT.md` or `12-RESEARCH.md`, and where a document's number was stale it is corrected
here without comment.

---

## File Classification

| New/Modified File | New? | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|---|
| `src/services/daily/dateKey.ts` | new | utility (pure policy) | transform | `src/services/endless/ramp.ts` | exact |
| `src/services/daily/streak.ts` | new | utility (pure policy) | transform | `src/services/endless/ramp.ts` | exact |
| `src/services/daily/index.ts` | new | barrel | — | `src/services/endless/index.ts` | exact |
| `src/services/storage/types.ts` | mod | model | CRUD (schema) | itself — `EndlessRecord` (`:125-137`), `ENDLESS_TELEMETRY_KEY` (`:145`), `RecordRunEndArgs` endless arm (`:295-302`) | exact |
| `src/services/storage/telemetry.ts` | mod | service (merge) | transform | `mergeEndlessRecord` (`:80-90`) + bound-on-write (`:157`) | exact |
| `src/services/storage/parseBlob.ts` | mod | service (sanitize on read) | transform | `sanitizeEndlessRecord` (`:337-347`) + read bound (`:442-443`) + `sanitizeRunLogEntry` drop-on-invalid (`:349-381`) | exact |
| `src/services/storage/memoryStore.ts` | mod | store | CRUD | its own endless arm (`:95-137`) | exact |
| `src/services/storage/asyncStorageStore.ts` | mod | store | CRUD | its own endless arm (`:367-420`), hand-mirrored from memoryStore | exact |
| `src/services/storage/index.ts` | mod | barrel | — | itself (`:19-32`, `:64-69`) | exact |
| `src/runtime/overlays/DailyResultOverlay.tsx` | new | component (leaf) | request-response (props in, callbacks out) | `src/runtime/overlays/ResultOverlay.tsx` | exact |
| `src/runtime/GameScreen.tsx` | mod | component (router) | request-response | its own `ResultOverlay` route (`:188-203`) + prop block (`:32-50`) | exact |
| `src/runtime/overlays/PauseOverlay.tsx` | mod | component | request-response | itself (`:42` a11y label) | exact |
| `src/runtime/appStatePause.ts` **or** a host-local subscription | mod/new | subscription (event source) | event-driven | `src/runtime/appStatePause.ts:14-26` + its only consumer `src/runtime/useGameLoop.ts:768-779` | exact — **see § The One Conflict** |
| `app/_components/PlayingHost.tsx` | mod | host (controller) | request-response + event-driven | its own endless branch: `startEndlessRun` (`:1313-…`), `handleRunEnded` (`:725-800`), dev row (`:1942-2015`) | exact |
| `docs/ops/DAILY-CHALLENGE.md` | new | doc (ops) | — | `docs/ops/ENDLESS-MODE.md` | exact |
| `tests/daily.dateKey.test.ts` | new | test (pure) | transform | `tests/endless.ramp.test.ts` | exact |
| `tests/daily.streak.test.ts` | new | test (pure) | transform | `tests/endless.ramp.test.ts` | exact |
| `tests/storage.daily-firewall.test.ts` | new | test (store) | CRUD | `tests/storage.endless-firewall.test.ts` | exact |
| `tests/storage.progress-v4.test.ts` | mod | test (parser) | transform | itself (`:278-345` endless-record sanitizer cases) | exact |
| `tests/ui/DailyResultOverlay.test.tsx` | new | test (component) | request-response | `tests/ui/ResultOverlay.test.tsx` | exact |
| `tests/ui/PlayingHost.daily-run.test.tsx` | new | test (host, jsdom) | event-driven | `tests/ui/PlayingHost.endless-run.test.tsx` | exact |

**Why every match is "exact":** this phase has no new architectural shape. Every capability
is the endless capability with a date substituted for a wave. Where that substitution is
*not* safe — the seed mint, the WON intercept, the telemetry key — the difference is called
out under the relevant assignment as an **anti-pattern**, because the analog is otherwise so
close that copying it wholesale is the most likely failure mode in this phase.

---

## Pattern Assignments

### `src/services/daily/dateKey.ts` + `streak.ts` (utility, transform)

**Analog:** `src/services/endless/ramp.ts` — the shipped precedent for "a per-mode policy is
two pure integer functions in `src/services/`, with a doc header that separates contract from
borrowed, and one dedicated test file as its guard."

**Header pattern** (`src/services/endless/ramp.ts:1-48`, abridged — copy the *structure*, the
headings are the load-bearing part):

```ts
/**
 * The endless wave policy (N-END-01 / N-END-03 / D-01 / D-02).
 *
 * Two pure integer functions answer the only two questions a wave asks: how hard is this
 * board, and which board is it. Their guard is `tests/endless.ramp.test.ts`.
 *
 * ## What is contract and what is borrowed
 * ...
 * `D_MAX` itself is **not** ours. It belongs to the frozen `src/levelgen` tree and is read
 * through its barrel, never restated here.
 *
 * ## Why the clamp lives in this body
 *
 * `generate` clamps its own difficulty argument (`src/levelgen/generate.ts:227`). That is a
 * backstop against a hostile caller, not this module's correctness argument: a policy that
 * emitted difficulty 400 and relied on somebody else to notice would be wrong even while
 * producing right answers.
 *
 * ## No implementation-approximated Math
 *
 * Same rule as `src/levelgen/schedule.ts:50-55`... Integer coercion and comparison clamps
 * only: no exponentiation, no trig/exp/log, no float remainder.
 */
```

The daily header owes the same four sections with different content: what is contract
(the `YYYY-MM-DD` key format, calendar arithmetic for the next boundary), what is borrowed
(`D_MAX` is still not ours; `DAILY_DIFFICULTY` is a number *into* `generate`, which clamps),
why the validation lives in this body (a tampered blob is the hostile caller), and the
no-approximated-`Math` rule — which here means **no `Intl`, no `toLocale*`, no
`toISOString()`, no `new Date(string)`**, for exactly the reason the ramp bans `Math.pow`:
a device-dependent answer that ships green.

**Function-body pattern** (`src/services/endless/ramp.ts:57-75`) — total, integer, degenerate
input folded rather than escaping:

```ts
export function difficultyForWave(wave: number): number {
  const step = (wave | 0) - 1;
  if (step < 0) {
    return 0;
  }
  if (step > D_MAX) {
    return D_MAX;
  }
  return step;
}

export function seedForWave(runSeed: number | string, wave: number): number {
  return mixSeed(hashSeed(runSeed), wave | 0);
}
```

**Layer constraints that decide this file's home** (re-derived from `eslint.config.js` today):

| Rule | Line | Consequence |
|---|---|---|
| `'D-13: no Date.now() in core/'` | `eslint.config.js:70` | the derivation may not live in `src/core/` |
| `'N-GEN-01: no Date.now() in levelgen/ — ambient input breaks seed reproducibility.'` | `eslint.config.js:117` | the derivation may not live in `src/levelgen/` |
| `from: { element: { type: 'services' } }` → `allow` `['services','core','levelgen']` | `eslint.config.js:319-323` | `src/services/daily/` **may** import the levelgen barrel (the ramp already does, `ramp.ts:50`) |
| `from: { element: { type: 'runtime' } }` → `allow` `['core','runtime','render','vfx']` | `eslint.config.js:257-263` | `DailyResultOverlay` **cannot** import `src/services/` — scalars only |
| `from: { element: { type: 'app' } }` → `allow` incl. `services` + `levelgen` | `eslint.config.js:276-291` | `PlayingHost.tsx` is the only legal home for derive→generate→write |

**Generate call — the signature, re-read today** (`src/levelgen/generate.ts:219-229`):

```ts
/**
 * Produce the board for `(seed, difficulty)`. Pure: the same arguments always produce a
 * JSON-identical `LevelFileV1`, in this process and any other.
 */
export function generate(seed: number | string, difficulty: number): LevelFileV1 {
  // Clamp first — never trust the caller. Phase 11 feeds a wave counter that runs past
  // D_MAX and Phase 12 feeds a date-derived value; an unclamped index would read past the
  // table (T-10-09).
  const d = Math.max(0, Math.min(D_MAX, difficulty | 0));
  const u32 = hashSeed(seed);
  const rng = makeRng(mixSeed(u32, d));
```

Note the signature is at **`:223`**, matching CONTEXT; the clamp comment at `:224-226` names
this phase by number. The string arm is likewise pre-authorised at `src/levelgen/rng.ts:78-86`:
*"`generate` accepts `number | string` so Phase 12 can pass a date string without a signature
change."* **No hashing step is to be added in `src/services/daily/`.**

---

### `src/services/daily/index.ts` (barrel)

**Analog:** `src/services/endless/index.ts` — the whole file, 3 lines:

```ts
/** Endless wave policy barrel (N-END-01 / N-END-03 / LC-16) — the only surface for this policy. */

export { difficultyForWave, seedForWave } from './ramp';
```

Named exports only; no `export *`. The one-line header states the requirement ids and that the
barrel is the only surface.

---

### `src/services/storage/types.ts` (model, schema)

**Analog:** its own endless members. Three separate patterns to copy.

**(a) The mode-key constant** (`types.ts:139-145`) — the answer to Pitfall 1:

```ts
/**
 * The `byMode.endless` map key (Phase 11 D-12). A plain constant string rather
 * than a `LevelId` because a generated board has no catalog id, and widening
 * `LevelId` to admit one would open every campaign-progress code path — the
 * `bestByLevel` and `unlocked` key type — to endless values.
 */
export const ENDLESS_TELEMETRY_KEY = 'endless' as const;
```

**(b) The record beside the aggregate map** (`types.ts:125-157`, the Pitfall-2 shape):

```ts
export type EndlessRecord = {
  /** Deepest wave ever reached ... */
  bestWave: number;
  /**
   * Highest score ever reached in an endless run, deliberately NOT
   * `ProgressBlob.bestScore` — that is the rolled-up *campaign* Title PB (see
   * `ProgressBlob` below), which an endless run must never raise (SC-3 / N-END-02).
   */
  bestScore: number;
};

export type TelemetryBlob = {
  lifetime: TelemetryAggregate;
  byMode: {
    campaign: Partial<Record<string, TelemetryAggregate>>;
    endless: Partial<Record<string, TelemetryAggregate>>;
    daily: Partial<Record<string, TelemetryAggregate>>;
  };
  /** Endless running maxima (N-END-02) — written only by `mergeEndlessRecord`. */
  endless: EndlessRecord;
  recentRuns: RunLogEntry[];
};
```

`byMode.daily` already exists at `:152`; the new per-date record is a **sibling of `endless`
at `:155`**, and it must carry the same one-line "written only by `mergeDailyRecord`" comment
— that comment is the only thing distinguishing `telemetry.daily` from `telemetry.byMode.daily`
at a glance.

The bound constant follows `RECENT_RUNS_BOUND` (`types.ts:47-51`), which states its arithmetic
rather than asserting a number — D-15's window size owes the same sentence:

```ts
/**
 * Bounded recent-run ring (D-05). ~120 bytes/entry × 50 ≈ 6KB against the ~2MB
 * Android CursorWindow practical ceiling — orders of magnitude of headroom.
 */
export const RECENT_RUNS_BOUND = 50 as const;
```

**(c) The discriminated union — the SC-5 mechanism** (`types.ts:270-302`). This is the change
the research called compiler-forced; here is exactly what both existing arms look like, verbatim:

```ts
/**
 * `recordRunEnd`'s argument (Phase 11 D-11 / SC-3 / N-END-02).
 *
 * A discriminated union on `mode`, not one flat object with an optional
 * `levelId`, because the campaign fields must be unreachable from a non-campaign
 * run AT COMPILE TIME. ...
 *
 * Phase 12 adds the `daily` arm when daily runs exist. Until then `daily` is
 * deliberately excluded rather than silently treated as campaign.
 */
export type RecordRunEndArgs =
  | {
      mode: 'campaign';
      /** Catalog level played — the key for `bestByLevel` and the unlock ladder. */
      levelId: LevelId;
      score: number;
      outcome: RunOutcome;
      livesRemaining: number;
      stats: RunStatsInput;
    }
  /**
   * The endless arm carries `wave` and has NO `levelId` — a generated board has
   * no catalog id (D-12), and that absence is what makes the campaign write
   * unreachable. `wave` and `score` fold into `telemetry.endless` (N-END-02);
   * nothing on this arm may reach `bestByLevel`, `unlocked` or `bestScore`.
   */
  | {
      mode: 'endless';
      wave: number;
      score: number;
      outcome: RunOutcome;
      livesRemaining: number;
      stats: RunStatsInput;
    };
```

The daily arm is shaped like the endless arm: a mode-specific field (`date: string` in place
of `wave: number`), `score`, `outcome`, `livesRemaining`, `stats`, and **no `levelId`**. The
doc comment above it owes the same sentence naming what the absence buys. The `Phase 12 adds
the daily arm…` note at `:276-277` is the line this phase consumes and must rewrite.

---

### `src/services/storage/telemetry.ts` (service, transform)

**Analog:** `mergeEndlessRecord` — "one merge function owns one record", verbatim
(`telemetry.ts:68-90`):

```ts
/**
 * Fold one finished endless run into the endless record (N-END-02).
 *
 * Deliberately NOT part of `mergeRunIntoTelemetry`: that function is the
 * mode-keyed aggregate/log path every mode shares, and keeping the record on a
 * separate entry point is what makes "a campaign run cannot write the endless
 * best" a structural fact rather than a convention. Same clone-then-mutate order
 * as `mergeRunIntoTelemetry` — the input blob is never touched.
 */
export function mergeEndlessRecord(
  telemetry: TelemetryBlob,
  run: { wave: number; score: number },
): TelemetryBlob {
  const next = cloneTelemetryBlob(telemetry);
  next.endless = {
    bestWave: Math.max(next.endless.bestWave, safeCounter(run.wave)),
    bestScore: Math.max(next.endless.bestScore, safeCounter(run.score)),
  };
  return next;
}
```

`mergeDailyRecord(telemetry, { date, score, outcome })` copies: clone first, mutate the clone,
return it; never touch the input; harden every incoming number through `safeCounter`
(`telemetry.ts:30-36`):

```ts
/** Counters stay non-negative integers even if a caller hands over garbage. */
function safeCounter(n: number): number {
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.floor(n);
}
```

**Bound-on-write pattern** (`telemetry.ts:157`) — D-15's precedent, one line, no state:

```ts
  next.recentRuns = [...next.recentRuns, entry].slice(-RECENT_RUNS_BOUND);
```

**Also needs a daily arm** (three sites, all already daily-aware for `byMode` but not for the
new record):

- `cloneTelemetryBlob` (`telemetry.ts:55-66`) — `endless: { ...t.endless }` at `:63` needs a
  daily sibling; `byMode.daily` is already cloned at `:61`.
- `mergeEndlessRecords` (`telemetry.ts:205-211`) — the memory↔disk per-field max.
- `mergeTelemetryBlobs` (`telemetry.ts:213-236`) — `endless: mergeEndlessRecords(...)` at `:233`.

**D-16 trap the analog does not cover:** `mergeEndlessRecords` is a pure per-field `Math.max`,
which is right for `longestStreak` but **wrong for `totalDaysPlayed`** (a count; max-merging two
devices' counts loses days, summing them double-counts). The endless analog offers no answer
because it has no cumulative field in a record. The nearest in-repo answer is
`mergeAggregates` (`telemetry.ts:161-183`), which sums cumulative fields and maxes `*Ever`
fields in the same function — the sum-vs-max contract stated at `telemetry.ts:5-8`. The daily
record is the first structure in the blob that needs **both** in one object; the planner owes
a decision, not a copy. (`src/services/storage/watermark.ts` is explicitly *not* the analog:
CONTEXT notes it merges score/stars watermarks and knows nothing about time.)

---

### `src/services/storage/parseBlob.ts` (service, sanitize-on-read)

**Analog (a) — the record sanitizer** (`parseBlob.ts:337-347`):

```ts
function sanitizeEndlessRecord(raw: unknown): EndlessRecord {
  const out = defaultEndlessRecord();
  if (raw == null || typeof raw !== 'object') {
    return out;
  }
  const map = raw as Record<string, unknown>;
  for (const key of Object.keys(out) as (keyof EndlessRecord)[]) {
    out[key] = safeCounter(map[key]);
  }
  return out;
}
```

Start from the default, copy only keys the default declares, coerce each independently — so a
broken field cannot discard a good sibling. Wired at `parseBlob.ts:427` inside
`sanitizeTelemetry`, whose doc comment (`:401-414`) states the independence contract the daily
record inherits verbatim.

**Analog (b) — drop-on-invalid for a keyed entry** (`parseBlob.ts:349-381`,
`sanitizeRunLogEntry`) is the model for validating a stored **date key**: validate each field
against a closed set, `return null` on any failure, and let the caller skip the entry
(`:436-441`). Pitfall 8's `isValidDateKey` slots in here. Note `GAME_MODE_SET` at `:314`
already contains `'daily'`, so no parser change is needed for daily *telemetry* — only for the
new record.

**Analog (c) — bound on read as well as on write** (`parseBlob.ts:434-444`):

```ts
  if (Array.isArray(telemetry.recentRuns)) {
    const entries: RunLogEntry[] = [];
    for (const item of telemetry.recentRuns) {
      const entry = sanitizeRunLogEntry(item);
      if (entry != null) {
        entries.push(entry);
      }
    }
    // Bound on read as well as on write — a tampered blob cannot grow the ring.
    out.recentRuns = entries.slice(-RECENT_RUNS_BOUND);
  }
```

**THE TRAP — read this before writing any `byMode.daily` code** (`parseBlob.ts:383-399`):

```ts
function sanitizeAggregateMap(
  raw: unknown,
): Partial<Record<string, TelemetryAggregate>> {
  const out: Partial<Record<string, TelemetryAggregate>> = {};
  if (raw == null || typeof raw !== 'object') {
    return out;
  }
  const map = raw as Record<string, unknown>;
  for (const key of Object.keys(map)) {
    const entry = map[key];
    if (entry == null || typeof entry !== 'object') {
      continue;
    }
    out[key] = sanitizeAggregate(entry);
  }
  return out;
}
```

**No key cap anywhere.** Every key in `byMode.daily` survives every parse, forever, in a blob
read whole on every app open. Keying `byMode.daily` by date is therefore the exact unbounded
collection D-15 exists to prevent — and per § The compiling-but-wrong fix below, it is also the
*smallest* edit that makes the broken store line compile again.

---

### `src/services/storage/memoryStore.ts` + `asyncStorageStore.ts` (store, CRUD)

**Analog:** the existing endless arm in each. The two stores are hand-mirrored — the firewall
test's own header says *"a gate added to one is no evidence about the other"* — so both get the
same edit and both get asserted.

**The gate + the telemetry key + the record write** (`memoryStore.ts:95-137`, the whole
`recordRunEnd`; the shape repeats at `asyncStorageStore.ts:367-420`):

```ts
    recordRunEnd(args: RecordRunEndArgs): ProgressBlob {
      // Campaign progress is mode-gated (SC-3 / N-END-02): an endless or daily
      // run must never move bestByLevel, bestScore or the unlock ladder. The
      // discriminated union makes args.levelId reachable ONLY inside this block,
      // so the gate cannot be dropped without a compile error.
      if (args.mode === 'campaign') {
        ...
      }
      // Telemetry is mode-keyed BY DESIGN and stays OUTSIDE the gate — every mode
      // accumulates runs/bricks/ticks. A generated endless board has no catalog id,
      // so it keys on the D-12 constant instead of a LevelId.
      const telemetryKey =
        args.mode === 'endless' ? ENDLESS_TELEMETRY_KEY : args.levelId;
      blob.telemetry = mergeRunIntoTelemetry(blob.telemetry, { ... });
      if (args.mode === 'endless') {
        // The endless record is the ONLY personal best an endless run may raise.
        // Nothing in here may reference bestByLevel, unlocked or bestScore.
        blob.telemetry = mergeEndlessRecord(blob.telemetry, {
          wave: args.wave,
          score: args.score,
        });
        blob.updatedAt = Date.now();
      }
      return cloneBlob(blob);
    },
```

Two facts worth stating plainly, both verified today:

1. The gate comment **already says "an endless or daily run"** at `memoryStore.ts:96-99` and
   `asyncStorageStore.ts:376-379`. CONTEXT § Established Patterns is right that SC-5 is largely
   held by shipped code — and right that the phase must *verify* it rather than assume it,
   because the comment was written before the daily arm existed and has never been exercised.
2. The `telemetryKey` ternary is **`memoryStore.ts:118-119`** and
   **`asyncStorageStore.ts:401-402`** — not `:119`/`:402` as 12-RESEARCH § Pitfall 1 states.
   The ternary spans two lines; `:119` / `:402` is its second half.

**§ The compiling-but-wrong fix.** Adding the daily arm makes `args.levelId` unreachable on
that arm, so the ternary above stops compiling. The smallest edit that makes it compile is
`args.mode === 'campaign' ? args.levelId : args.date` — and combined with `sanitizeAggregateMap`
above, that is the unbounded map. The correct edit is a three-way selection that reaches a
`DAILY_TELEMETRY_KEY = 'daily' as const` constant (modelled on `types.ts:139-145`) and **never
a date**. Warning sign for review: any `byMode.daily[` with a variable subscript.

---

### `src/runtime/overlays/DailyResultOverlay.tsx` (component, leaf)

**Analog:** `src/runtime/overlays/ResultOverlay.tsx`. The UI-SPEC is explicit that
`ResultOverlay.mode` stays `'campaign' | 'endless'` and is **never** widened — a separate
component is the SC-5 mechanism at the prop signature. So this is a copy-the-shape analog,
not an extend-the-file analog.

**Imports** (`ResultOverlay.tsx:1-2`) — the entire import surface of a `src/runtime` overlay:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```

Nothing else. No storage import is possible (`eslint.config.js:257-263`), which is why every
daily value arrives as a scalar prop.

**Props pattern** (`ResultOverlay.tsx:4-37`) — each prop's doc comment names *which mode owns
it*; the daily props get the same treatment, and `nowMs` gets the UI-SPEC's
"injected, never `Date.now()` in render" sentence:

```tsx
type Props = {
  kind: 'win' | 'lose';
  /**
   * Which record domain this overlay is showing (11-08 / gap 2). The two modes share
   * one component precisely so neither can read the other's numbers: everything mode
   * specific is a prop selected by the host, and nothing in here reaches storage.
   */
  mode: 'campaign' | 'endless';
  score: number;
  /** Campaign: the level PB. Endless: `telemetry.endless.bestScore`, post-merge. */
  best: number;
  ...
  onRetry: () => void;
  onMenu: () => void;
  /** Omit Next when null/undefined (D-11); do not show a gated-off control. */
  onNext?: (() => void) | null;
};
```

**Conditional-line pattern** (`ResultOverlay.tsx:189-204`) — the line order is contract and
each optional line is a ternary to `null`, never a disabled/greyed variant:

```tsx
        {isEndless && showRunLines ? (
          <Text style={styles.metric}>Wave · {wave}</Text>
        ) : null}
        {showRunLines ? (
          <Text style={styles.metric}>Score · {score}</Text>
        ) : null}
        <Text style={styles.metric}>Best · {best}</Text>
        {isEndless ? (
          <Text style={styles.metric}>Best wave · {bestWave}</Text>
        ) : null}
        {showStars ? <StarRow filled={stars} /> : null}
        {isNewRecord ? (
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>New Record</Text>
          </View>
        ) : null}
```

**Scrim + panel + control pattern** (`ResultOverlay.tsx:152-168`, `:205-236`):

```tsx
    <View
      style={[
        styles.scrim,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
      pointerEvents="auto"
    >
      <View style={styles.panel}>
        <Text style={[styles.heading, !isWin && styles.loseHeading]}>
          {isWin ? 'Win' : 'Lose'}
        </Text>
```

```tsx
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isEndless ? 'Retry endless run from wave 1' : 'Retry level'
          }
          onPress={onRetry}
          style={[styles.button, styles.retrySpaced]}
        >
          <Text style={styles.buttonLabel}>Retry</Text>
        </Pressable>
        ...
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to title"
          onPress={onMenu}
          style={[styles.menuButton, styles.buttonSpaced]}
        >
          <Text style={styles.menuLabel}>Menu</Text>
        </Pressable>
```

**Stylesheet — copy these values verbatim** (`ResultOverlay.tsx:242-358`). The UI-SPEC's chrome
table is a transcription of this block; it was re-read today and matches. The rows the daily
panel needs:

```tsx
  scrim:  { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center', alignItems: 'center' },            // :243-248
  panel:  { backgroundColor: '#12121f', padding: 24, minWidth: 200,
            maxWidth: 320, alignItems: 'stretch' },                       // :249-255
  heading:{ color: '#FFFFFF', fontFamily: 'SpaceMono', fontSize: 20,
            fontWeight: '600', lineHeight: 24, textAlign: 'center',
            marginBottom: 16 },                                           // :256-264
  loseHeading: { color: '#E85D5D' },                                      // :265-267
  body:   { ...16/400/24, textAlign: 'center', marginBottom: 16 },        // :268-276
  metric: { ...16/400/24, textAlign: 'center', marginBottom: 8 },         // :277-285
  badge:  { alignSelf: 'center', backgroundColor: '#F2CC8F', padding: 4,
            marginBottom: 16 },                                           // :305-310
  badgeLabel: { color: '#1a1a2e', ...14/400/20 },                         // :311-317
  button: { minHeight: 44, minWidth: 44, paddingHorizontal: 16,
            paddingVertical: 12, justifyContent: 'center',
            alignItems: 'center', backgroundColor: '#FFFFFF' },           // :318-326
  retrySpaced / buttonSpaced: { marginTop: 16 },                          // :327-332
  buttonLabel: { color: '#1a1a2e', ...16/400/24 },                        // :333-339
  menuButton: { ...button geometry, backgroundColor: '#12121f',
                borderWidth: 1, borderColor: '#FFFFFF' },                 // :340-350
  menuLabel:  { color: '#FFFFFF', ...14/400/20 },                         // :351-357
```

**Do not copy** `starsRow` / `starGlyph` / `starFilled` / `starEmpty` (`:286-304`). D-12 bans
stars from daily, and `starEmpty`'s `#6B7280` is the muted colour the UI-SPEC fences to dev
borders (3.84:1 on the panel — fails AA).

**Named-boundary pattern worth reusing** (`ResultOverlay.tsx:61-68`): `waveBuildFailureKind` is
an exported pure classifier with its own unit cases, rather than a comparison inlined at each
reader, *"so the body copy and the run-scoped line suppression can never disagree about which
case they are in"*. The daily panel has the same shape twice — the countdown's three forms plus
the omit case, and the streak-ended line's five-case derivation. Both are better as exported
pure functions of scalars than as JSX ternaries, for the same stated reason.

---

### `src/runtime/GameScreen.tsx` (component, router)

**Analog:** its own `ResultOverlay` route. **Prop doc pattern** (`GameScreen.tsx:32-37`) — this
is where the layer rule gets restated for a reader:

```tsx
  /**
   * Which record domain the Results overlay is reading (11-08 / gap 2).
   * `src/runtime` receives plain numbers and a discriminant — it never imports the
   * storage layer, so the boundaries matrix is unchanged (LC-05).
   */
  mode: 'campaign' | 'endless';
```

**Route pattern** (`GameScreen.tsx:188-203`) — an overlay is a `showX ? <X … /> : null` inside
`styles.chrome`, with every value threaded explicitly:

```tsx
        {showResult ? (
          <ResultOverlay
            kind={result!}
            mode={mode}
            score={score}
            best={best}
            wave={wave}
            bestWave={bestWave}
            waveBuildFailedWave={waveBuildFailedWave}
            isNewRecord={isNewRecord}
            stars={stars}
            onRetry={onRetry}
            onMenu={onMenu}
            onNext={onNext}
          />
        ) : null}
```

**Dev-row slot** (`GameScreen.tsx:207-222`) — the UI-SPEC's optional `flexWrap` remedy touches
exactly this block and `styles.devSwitchSlot` (`:259-261`). Note `pointerEvents="box-none"` is
already present at `:218`, so a full-width row still passes playfield taps through:

```tsx
        {/* Above pause/result scrims so __DEV__ level cycle stays tappable during smoke. */}
        {devLevelSwitch != null ? (
          <View
            style={[
              styles.devSwitchSlot,
              { top: insets.top + HUD_STRIP_CONTENT + 8, right: padR, zIndex: 20 },
            ]}
            pointerEvents="box-none"
          >
            {devLevelSwitch}
          </View>
        ) : null}
```

---

### `src/runtime/overlays/PauseOverlay.tsx` (component)

**Analog:** itself. The file is 4 props wide (`:4-15`) and its `Retry` carries a hardcoded
label at `:42`:

```tsx
          accessibilityLabel="Retry level"
          onPress={onRetry}
```

The UI-SPEC requires `Restart today's board` during a daily run. The shipped precedent for
"same visible label, mode-dependent a11y label" is `ResultOverlay.tsx:207-213` — a ternary on a
mode discriminant with the reason in a comment above it (*"`Retry level` is FALSE in endless:
there is no level"*). Copy that, not a new component.

---

### `app/_components/PlayingHost.tsx` (host, controller)

**Analog:** its own endless machinery. Five separate patterns.

**(a) Host-local mode state, mirrored into a ref** (`PlayingHost.tsx:271-294`):

```tsx
  /**
   * Endless mode (N-END-01 / D-10) is HOST-LOCAL state: entered by the `__DEV__`
   * entry on the dev row, never threaded down from `GameHost`. D-05 makes the
   * entry temporary and Phase 14 replaces it with the real Title route, so the
   * shell plumbing that a `mode` prop would build is plumbing Phase 14 would
   * immediately have to unpick.
   *
   * Every callback-visible piece of this is mirrored into a `useRef`. That is not
   * belt-and-braces: `applyChrome` is memoised and the chrome reaction holds the
   * memoised identity, so a `useState` read inside it is the value from whenever
   * the callback was last built — the exact staleness `runEndedRef` already exists
   * to avoid (11-RESEARCH § Pitfall 5).
   */
  const [mode, setMode] = useState<'campaign' | 'endless'>('campaign');
  const modeRef = useRef<'campaign' | 'endless'>('campaign');
  const [wave, setWave] = useState(1);
  const waveRef = useRef(1);
  /** Minted per run in the APP tier — src/levelgen bans wall-clock reads (Pitfall 7). */
  const runSeedRef = useRef(0);
  /** Pitfall 5 idempotency guard: the WON mirror can arrive twice before the advance lands. */
  const waveAdvanceInFlightRef = useRef(false);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
```

Widening `mode` to `'campaign' | 'endless' | 'daily'` here is the host-side counterpart of the
union change in `types.ts`. Anything the daily branch reads from a memoised callback needs the
ref mirror, for the reason stated at `:279-284` — this includes the current date key.

**(b) Branch-before-compare in the run-end funnel** (`PlayingHost.tsx:725-800`). Read the
comment at `:732-748` in full before writing the daily arm; it is the post-mortem of the exact
bug SC-5 forbids:

```tsx
      // 11-UI-SPEC § Record Display Contract: **the mode branch happens FIRST**.
      //
      // Gap 2 was precisely the opposite order — `evaluatePersonalBest(runScore,
      // previousBestRef.current)` ran above this line and the mode branch came after,
      // so an endless run was compared against a CAMPAIGN level best. ...
      let record: boolean;
      if (modeRef.current === 'endless') {
        const runWave = waveRef.current;
        ...
        const blob = store.recordRunEnd({
          mode: 'endless',
          wave: runWave,
          score: runScore,
          outcome,
          livesRemaining,
          stats,
        });
        // "Displayed values are post-merge" (11-UI-SPEC): `recordRunEnd` returns the
        // blob SYNCHRONOUSLY and that blob already carries the merged
        // `telemetry.endless` ... — not a second, racing `getSnapshot()`.
        const merged = blob.telemetry?.endless;
        ...
        // `previousBestRef` is NOT assigned here, and that omission is the fix.
        setResultStars(null);
        setNextGateId(null);
      } else {
```

The synchronous post-merge read at `:769-782` is precisely the UI-SPEC's "write first, then
render the panel **from the stored record**" — the daily arm reads `blob.telemetry.daily` off
the same synchronous return, with the same "fail soft to the pre-run values if the field is
absent" treatment, and the same explicit `setResultStars(null)` / no-`previousBestRef` tail.

**(c) The `__DEV__` dev-row control** (`PlayingHost.tsx:1942-1987`) — S1's exact model,
including the "TEMPORARY, Phase 14 deletes this" comment that must be repeated for `Daily`:

```tsx
  const devLevelSwitch =
    typeof __DEV__ !== 'undefined' && __DEV__ ? (
      <View style={styles.devRow}>
        ...
        {/*
          D-05: TEMPORARY. Endless has no production entry this phase — Phase 14
          ships the real Title route and DELETES this Pressable and the wave
          readout beside it. Nothing else should grow a dependency on them.
        */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start an endless run"
          onPress={startEndlessRun}
          hitSlop={8}
          style={styles.devSwitch}
        >
          <Text style={styles.devSwitchLabel}>Endless</Text>
        </Pressable>
```

The `Daily` Pressable goes **immediately after this one** (UI-SPEC § Entry point: "immediately
to the right of `Endless`"), with `accessibilityLabel="Open today's daily challenge"` and
visible label `Daily`. Styles are already declared: `styles.devRow` (`:2072-2076`),
`styles.devSwitch` (`:2061-2071`), `styles.devSwitchLabel` (`:2077-2083`) — 12px/16px, which
is the documented below-scale dev exception. **No `D{n}` readout** — the `W{n}` `Text` at
`:1993-1998` is the thing the UI-SPEC declined to duplicate.

**(d) Host → GameScreen prop threading** (`PlayingHost.tsx:2020-2051`), including the comment
that decides state-vs-ref at the render boundary:

```tsx
        <GameScreen
          ...
          // The `mode` STATE, not `modeRef` — the overlay has to re-render on the flip,
          // and a ref read during render would hand it the pre-flip value.
          mode={mode}
          wave={resultWave}
          bestWave={resultBestWave}
          ...
          devLevelSwitch={devLevelSwitch}
        />
```

**(e) The purity constraint, cited in-repo** (`PlayingHost.tsx:358-361`):

```tsx
   * Seeded 0, not `Date.now()`: `react-hooks/purity` forbids an impure call during
   * render, and the seed is never read — `wallClockActiveRef` starts false, and the
   * uiPhase effect stamps a real start the moment a segment opens.
```

This is why `nowMs` is a prop and the date key is derived in a callback or effect. The comment
is at `:360` as the research states.

**Anti-patterns — the two adjacent lines this phase must NOT copy:**

1. **`startEndlessRun` re-mints the seed** (`PlayingHost.tsx:1374-1375`):
   ```tsx
       const prevSeed = runSeedRef.current;
       runSeedRef.current = Date.now() >>> 0;
   ```
   Correct for endless (N-END-03 wants a fresh run sequence; `tests/ui/PlayingHost.endless-run.test.tsx:391-408`
   asserts it). An outright SC-1 / N-DAILY-01 break in daily: the daily seed is the date key
   and nothing else. The daily start path is `startEndlessRun`-shaped **minus** the mint.
2. **The `WON` wave-advance intercept** (`PlayingHost.tsx:1051`, `advanceToWave(waveRef.current + 1)`),
   reached from `applyChrome`. A cleared daily board **ends the run** (D-10). If the intercept
   is reached from daily, the board silently advances and the date never closes.

Both live within ~330 lines of where the daily branch goes.

---

### `docs/ops/DAILY-CHALLENGE.md` (doc, ops)

**Analog:** `docs/ops/ENDLESS-MODE.md`. N-DAILY-03 asks for an explicit written policy;
`docs/ops/` is where this project puts them.

**Front-matter pattern** (`ENDLESS-MODE.md:1-11`) — note it states what was *not* verified:

```markdown
# Endless mode (Phase 11)

**Status:** Implemented 2026-09-25
**Requirements:** N-END-01 (...) · N-END-02 (...) · N-END-03 (...)
**Consumers:** Phase 12 daily (board-swap seam) · Phase 13 achievements · Phase 14 Title entry
**Owner sign-off:** **not obtained.** No human play calibrated anything in this document.
Every number below comes from deterministic headless measurement ... See *Limits* at
the end; in particular the **device half of SC-5 is still unmeasured** as of this document.
```

**"Why this document exists" pattern** (`ENDLESS-MODE.md:13-24`) — it names the success
criterion the document *is*, and points at the code + its guard:

```markdown
## Why this document exists

Success criterion SC-2 is not satisfied by a correct `difficultyForWave`. It asks that
difficulty rise with wave number *"with the ramp written down rather than tuned by feel in
code"*. This file is the written-down ramp. ...

The policy itself lives in `src/services/endless/ramp.ts` — two pure integer functions, guarded
by `tests/endless.ramp.test.ts`.
```

**Section skeleton to mirror** (`ENDLESS-MODE.md` headings, re-read today): `## Why this
document exists` (`:13`) → the policy itself (`:26`) with sub-sections for each decision
(`:45`, `:53`, `:75`) → `## Measured behaviour` (`:135`) → `## The settled open question`
(`:199`) → `### Flagged assumptions from this round` (`:338`) → `## Limits` (`:385`).

D-01 is the one-sentence policy this document exists to carry, plus the clock cases (D-02/D-03/
D-04), the accepted practice hole (D-08), the accepted read-failure second attempt (UI-SPEC
§ Storage-failure), and the Hermes per-runtime timezone cache consequence (research Pitfall 5)
— which belongs under a `Limits`-style section, since it is a named, bounded, unmitigated cost.

---

### `tests/daily.dateKey.test.ts` + `tests/daily.streak.test.ts` (test, pure)

**Analog:** `tests/endless.ramp.test.ts`. **Header pattern** (`:1-25`) — it states the analog it
copied, the convention it follows, and what it deliberately does not cover:

```ts
/**
 * N-END-01 / N-END-03 — the wave ramp steps, clamps and never repeats a board (SC-2 / SC-4).
 * ...
 * Analog: `tests/levelgen.schedule.test.ts` — the same loop-the-whole-range shape and the
 * same `expect(value, 'why')` second-argument convention, walked over wave index instead of
 * difficulty index; and `tests/levelgen.determinism.test.ts:52`'s `new Set(...).size`
 * uniqueness idiom for the distinct-seed and distinct-board cases.
 *
 * **No assertion in this file pins a literal dial constant.** It asserts derived properties
 * — starts at 0, one step per wave, clamps at `D_MAX`, integer-only, distinct seeds,
 * distinct boards — for the same reason `levelgen.schedule.test.ts` does: the dials were
 * calibrated against bot clear time with no human cohort behind them, and a test that
 * pinned one would fail the moment it is legitimately re-tuned. `D_MAX` is read from the
 * generator barrel, never restated.
 *
 * Deliberately NOT covered here: whether a *generated board* actually realises its
 * difficulty. That is exact-weight equality in `tests/levelgen.sweep.test.ts`...
 */
import { describe, it, expect } from 'vitest';
import { D_MAX, generate } from '../src/levelgen';
import { difficultyForWave, seedForWave } from '../src/services/endless';
```

**Constants-at-the-top pattern** (`:29-37`) — each named with the reason it exists:

```ts
/** The wave at which the walk first reaches the ceiling: wave 1 is difficulty 0. */
const CLAMP_WAVE = D_MAX + 1;
/** Far past any reachable wave — the clamp must hold without a bound anybody tuned. */
const FAR_WAVE = 10000;
/** One run's worth of waves for the uniqueness cases (VALIDATION's SC-4 row asks for >= 60). */
const UNIQUE_WAVES = 60;
```

**Case-naming pattern** (`:39-121`): `describe('<fn> (<criterion> / <requirement>, <plan>)')`
with `it('<behaviour> (<decision id>)')`, including the degenerate-input case
(`:58` *"never leaves [0, D_MAX] and never returns a non-integer, including degenerate input"*)
— the daily counterpart being non-finite `nowMs`, and a date key from a tampered blob.

**One thing the analog does not supply:** TZ pinning. The research established
(§ Finding 5) that `process.env.TZ` reassigned mid-test is honoured under this project's own
`npx vitest run`. No shipped test in `tests/` does this today, so it is a new idiom for this
repo, not a copy — the planner should treat it as such rather than pointing at an analog.
The `DAILY_DIFFICULTY` constant gets the ramp's no-literal-dials treatment: assert derived
properties, not the number.

---

### `tests/storage.daily-firewall.test.ts` (test, store) — the SC-5 instrument

**Analog:** `tests/storage.endless-firewall.test.ts`, the whole file. This is the model the
research named and it is a near-total copy target.

**Header pattern** (`:1-20`) — states what defect it exists against, and why it asserts twice:

```ts
/**
 * SC-3 / N-END-02 — the endless firewall.
 *
 * Research found a live defect: `recordRunEnd` wrote `bestByLevel`, raised
 * `blob.bestScore` (inside `applyLevelBest`) and called `unlockAfterClearPure`
 * for EVERY mode, with no reference to `args.mode` ... This file is
 * the proof that it cannot, asserted SEPARATELY for the memory store and the
 * AsyncStorage-backed store, because they are two hand-mirrored implementations
 * and a gate added to one is no evidence about the other.
 *
 * The guarantee has two halves and both are checked here:
 *   - runtime: the `args.mode === 'campaign'` gate in both stores (the `it`s below);
 *   - compile time: `RecordRunEndArgs` is a discriminated union whose endless arm
 *     has no `levelId`, pinned by the `@ts-expect-error` case — which fails
 *     `npm run typecheck` if the union ever collapses back to a flat type.
 *
 * Level ids come from `PLAYABLE_LEVEL_ORDER`, never as literals: the campaign
 * order has been reshuffled once already (E2).
 */
```

**Run-both-stores pattern** (`:37-47`, `:55-56`, `:191-194`):

```ts
/** Minimal in-memory AsyncStorage double — genuinely async, like the device. */
function fakeAsyncStorage(seed: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    map,
    getItem: async (key: string): Promise<string | null> => map.get(key) ?? null,
    setItem: async (key: string, value: string): Promise<void> => { map.set(key, value); },
  };
}

function firewallSuite(label: string, makeStore: () => ProgressStore): void {
  describe(`endless firewall — ${label} (SC-3 / N-END-02)`, () => { /* … */ });
}

firewallSuite('memory store', () => createMemoryProgressStore());
firewallSuite('AsyncStorage-backed store', () =>
  __createAsyncStorageProgressStoreForTests(fakeAsyncStorage()),
);
```

**The byte-identical assertion** (`:57-79`) — this is SC-5's core case, verbatim:

```ts
    it('an endless win leaves unlocked, bestByLevel and bestScore byte-identical to their pre-call values', async () => {
      const store = makeStore();
      const before = await store.getSnapshot();

      store.recordRunEnd({ mode: 'endless', wave: 14, score: 8_400, outcome: 'win',
        livesRemaining: 3, stats: runStats({ bricksBroken: 260, ticksPlayed: 30_000 }) });

      const after = await store.getSnapshot();
      expect(after.unlocked).toEqual(before.unlocked);
      expect(after.bestByLevel).toEqual(before.bestByLevel);
      expect(after.bestScore).toBe(before.bestScore);
      // The defect wrote `bestByLevel[undefined]`; assert the map gained no key at all.
      expect(Object.keys(after.bestByLevel)).toEqual(Object.keys(before.bestByLevel));
      expect(after.bestScore).toBe(0);
    });
```

**The "proof the write LANDED" companion** (`:81-101`) — a firewall test that only asserts
absence passes trivially if the write was dropped:

```ts
      expect(after.telemetry.endless).toEqual({ bestWave: 14, bestScore: 8_400 });
      expect(after.telemetry.byMode.endless[ENDLESS_TELEMETRY_KEY]?.runsPlayed).toBe(1);
      ...
      // …and it landed under the D-12 constant key, not under a campaign level id.
      expect(after.telemetry.byMode.campaign).toEqual({});
```

The daily counterpart asserts `byMode.daily[DAILY_TELEMETRY_KEY]` and — the D-15 case with no
endless analog — that `Object.keys(after.telemetry.byMode.daily)` still has length 1 after
N dates, which is the regression alarm for the Pitfall-1 wrong fix.

**The compile-time half** (`:168-187`):

```ts
    it('a campaign-shaped argument cannot be supplied on the endless arm — the compile-time half of SC-3 (D-11)', () => {
      store.recordRunEnd({
        mode: 'endless',
        // @ts-expect-error — the endless arm has no `levelId`; campaign fields are
        // unreachable from a non-campaign run at the type level (D-11 / SC-3).
        levelId: PLAYABLE_LEVEL_ORDER[0],
        wave: 1, score: 1, outcome: 'lose', livesRemaining: 0, stats: runStats(),
      });
      expect(true).toBe(true);
    });
```

**Also add cases to `tests/storage.progress-v4.test.ts`** for the read-side sanitizer, mirroring
its endless-record block at `:278-345` — *"a partial endless record keeps the fields it does
have…"* (`:278`), *"every non-numeric endless field shape degrades to 0 without touching its
sibling field"* (`:306`), and the migration-free case *"an existing v4 blob written before the
endless record existed parses with the field defaulted and every campaign field intact — no
version bump, no migration"* (`:346`). That last one is the proof the daily record needs no v5.

---

### `tests/ui/DailyResultOverlay.test.tsx` (test, component)

**Analog:** `tests/ui/ResultOverlay.test.tsx`. **Harness pattern** (`:1-31`):

```tsx
/**
 * N-PROG-04 — ResultOverlay Next + stars (C2 Plan 02).
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ResultOverlay, waveBuildFailureKind } from '../../src/runtime/overlays/ResultOverlay';

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

afterEach(cleanup);

const base = { mode: 'campaign' as const, score: 500, best: 500, wave: 0, bestWave: 0,
  isNewRecord: false, onRetry: () => {}, onMenu: () => {} };
```

The `base` spread + per-case override idiom is what makes the daily panel's 11-row line-order
contract and its three countdown forms cheap to enumerate. The line-order case to copy is
`:201` *"renders the four metric lines in contract order: wave, score, best, best wave"*; the
absence cases to copy are `:229` (*"campaign renders neither endless line"*) and `:244`
(*"the win chrome is unreachable in endless even when stars and onNext are supplied (SC-1)"*)
— the latter is the direct model for "no `Retry`, no star row, no `Best ·` score line on a
closed daily date, even if a caller passes them". The exported-pure-classifier cases at
`:166-198` model the countdown/streak-ended derivation tests.

---

### `tests/ui/PlayingHost.daily-run.test.tsx` (test, host, jsdom)

**Analog:** `tests/ui/PlayingHost.endless-run.test.tsx` — the UI-SPEC names this file as E5's
instrument, and it is the only place in the repo that drives the real host under jsdom.

**Header + `__DEV__` stub** (`:1-33`):

```tsx
/**
 * Plan 11-05 — an endless run driven through the real host.
 * ...
 * The harness is the host's own bridge, not a reimplementation of it: the
 * Reanimated mock captures every `useAnimatedReaction` pair, and firing them is
 * exactly what the UI runtime does when `chromeSeq` bumps. `generate`,
 * `compileGeneratedLevel` and the endless ramp are all REAL here — the boards
 * below are the boards a device would get.
 *
 * @vitest-environment jsdom
 */
...
// The entry is `__DEV__`-gated (D-05), which is the point — so the harness has to
// stand where a dev build stands. An undefined `__DEV__` renders no dev row at all.
vi.stubGlobal('__DEV__', true);
```

**The mock wall** (`:43-142`): `expo-font`, `expo-keep-awake`, `@shopify/react-native-skia`,
`react-native-reanimated` (with the stable-`useSharedValue` warning at `:47-55` — read it, a
naive mock measures the harness instead of the host), `src/input`, `useVfxIntensity`,
`resolveQualityTier`, `services/audio`, `services/platform`, `devflags`, `crashReporting`,
`bakeGlowSprites`, and this one, which is what makes the dev row reachable (`:138-142`):

```tsx
/** Render the dev row so the `__DEV__` endless entry is pressable. */
vi.mock('../../src/runtime/GameScreen', () => ({
  GameScreen: (props: { devLevelSwitch?: unknown }) =>
    (props.devLevelSwitch ?? null) as never,
}));
```

**The mocked store — E5's instrument** (`:144-171`):

```tsx
const recordRunEnd = vi.fn((_args: RecordRunEndArgs) => ({
  bestByLevel: {},
  unlocked: [],
  telemetry: { endless: { bestWave: 0, bestScore: 0 } },
}));
vi.mock('../../src/services/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/storage')>();
  return {
    ...actual,
    createDefaultProgressStore: () => ({
      getBestForLevel: () => Promise.resolve(0),
      getSnapshot: () => Promise.resolve({ bestByLevel: {}, unlocked: [],
        telemetry: { endless: { bestWave: 0, bestScore: 0 } } }),
      recordRunEnd,
      flush: () => Promise.resolve(),
    }),
  };
});
```

The daily version returns a `telemetry.daily` record from both `recordRunEnd` and
`getSnapshot` — the host's daily arm reads the post-merge record off the synchronous
`recordRunEnd` return (see PlayingHost pattern (b)), so a mock that omits it silently exercises
the fail-soft path instead of the real one. The comment at `:147-150` says exactly this about
the endless field.

**Press-a-dev-control-by-a11y-name** (`:260-288`):

```tsx
async function mountAndStartEndless(): Promise<void> {
  const { PlayingHost } = await import('../../app/_components/PlayingHost');
  render(createElement(PlayingHost, { levelId: 'level-01' as LevelId, onMenu: () => {} }));
  await act(async () => { await Promise.resolve(); vi.runAllTimers(); await Promise.resolve(); });
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Start an endless run' })).toBeTruthy();
  });
  setActive.mockClear(); retry.mockClear(); advanceWave.mockClear(); recordRunEnd.mockClear();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Start an endless run' }));
    await Promise.resolve();
  });
}
```

For daily: the same function with `{ name: "Open today's daily challenge" }`.

**Deliver a phase mirror** (`:237-258`) — how a win/lose is driven without a real sim:

```tsx
let seq = 0;
async function deliverPhase(phase: number, fields: { lives?: number; score?: number } = {}) {
  const prev = seq; seq += 1;
  chromeSv().value = { phase, lives: fields.lives ?? 3, score: fields.score ?? 0, combo: 1, stallTier: 0 };
  await act(async () => {
    for (const reaction of reactions) { reaction.fn(seq, prev); }
    await Promise.resolve();
  });
}
```

with `SIM = { DOCKED: 0, PLAYING: 1, WON: 2, LOST: 3 }` (`:36`).

**Assert over the recorded args with narrowing** (`:361-389`) — the exact shape E5 needs:

```tsx
    expect(recordRunEnd, 'the run must record exactly once').toHaveBeenCalledTimes(1);
    const args = recordRunEnd.mock.calls[0]![0];
    expect(args.mode).toBe('endless');
    // The narrowing below is the D-11 contract in miniature: `wave` is only
    // reachable once TypeScript knows the arm, and `levelId` never becomes
    // reachable at all.
    if (args.mode !== 'endless') {
      throw new Error('expected the endless arm of RecordRunEndArgs');
    }
    expect(args.wave, 'the wave reached rides the endless arm').toBe(2);
    expect(args.outcome).toBe('lose');
    expect(
      args,
      'the endless arm has NO levelId — that absence is what makes the campaign write unreachable (D-11 / SC-3)',
    ).not.toHaveProperty('levelId');
```

The daily cases substitute `mode: 'daily'`, `args.date`, and `outcome: 'abandoned'` for E5's
"pressing `Lv` / tier / `Cert WC` during a live daily run records `abandoned` and the date stays
open". **Do not copy** `:391-408` (*"two runs are not the same board sequence — the seed is
minted per run (N-END-03)"*, which spies `Date.now` and asserts the fingerprints **differ**) —
the daily assertion is its exact inverse: same injected `Date.now`, same board, and a *different*
date must give a different board. The `compiledBoard()` / `boardFingerprint()` helper pair at `:219-235` is reusable for
both directions.

---

## Shared Patterns

### Doc-comment-as-contract

**Source:** everywhere; canonical examples `src/services/storage/types.ts:270-278`,
`src/services/storage/telemetry.ts:68-79`, `src/runtime/overlays/ResultOverlay.tsx:39-60`.
**Apply to:** every new file in this phase.

The house style is that a non-obvious construct carries the *reason it is that way and what
breaks if it is changed*, naming the decision id. A daily file that only describes what the
code does will read as foreign in this tree. `ResultOverlay.tsx:52-59` is the sharpest
instance: it explains why a boundary is a named function rather than an inlined comparison, and
names the future change that would break the invariant.

### Mode gating by discriminated union, not by convention

**Source:** `src/services/storage/types.ts:270-302`; enforced at `memoryStore.ts:95-119` and
`asyncStorageStore.ts:367-402`; proved at `tests/storage.endless-firewall.test.ts:168-187`.
**Apply to:** `types.ts`, both stores, `PlayingHost.tsx`, `tests/storage.daily-firewall.test.ts`.

SC-5 is not a runtime check with a test — it is a type whose narrowing makes the campaign write
unreachable, plus a `@ts-expect-error` case that fails `npm run typecheck` if the union ever
collapses. Both halves ship together or neither counts.

### Bound on write AND on read

**Source:** write `src/services/storage/telemetry.ts:157`; read `src/services/storage/parseBlob.ts:442-443`;
constant with its arithmetic `src/services/storage/types.ts:47-51`.
**Apply to:** the daily history (D-15), in `telemetry.ts`, `parseBlob.ts` and `types.ts`.

```ts
  next.recentRuns = [...next.recentRuns, entry].slice(-RECENT_RUNS_BOUND);
```
```ts
    // Bound on read as well as on write — a tampered blob cannot grow the ring.
    out.recentRuns = entries.slice(-RECENT_RUNS_BOUND);
```

The write bound is what D-15 asks for; the read bound is what makes it hold against a blob
written by an older build or edited on a rooted device. `sanitizeAggregateMap`
(`parseBlob.ts:383-399`) is the counter-example in the same file — no cap, every key preserved.

### Degrade-in-the-playable-direction on read

**Source:** `src/services/storage/parseBlob.ts:401-414` (the `sanitizeTelemetry` doc comment)
and `:349-381` (`sanitizeRunLogEntry` returning `null`).
**Apply to:** the daily record sanitizer, `isValidDateKey`, the UI-SPEC's storage-failure rules.

Telemetry corruption degrades telemetry **alone** and never makes the enclosing blob read as
`corrupt`; an unparseable entry is dropped, not repaired. For daily this lands on the
already-accepted cost in UI-SPEC § Storage-failure: an unreadable record means "this date has
no stored result", i.e. playable.

### Scalar-props leaf overlays

**Source:** `src/runtime/overlays/ResultOverlay.tsx:1-37`; the rule at `eslint.config.js:257-263`;
the rationale restated for readers at `src/runtime/GameScreen.tsx:32-36`.
**Apply to:** `DailyResultOverlay.tsx`, `GameScreen.tsx`.

`src/runtime` may import only `core`, `runtime`, `render`, `vfx`. The overlay cannot name a
storage type, so SC-5 is checkable by reading the prop list.

### `__DEV__`-gated temporary entry

**Source:** `app/_components/PlayingHost.tsx:1942-1943` (the guard expression), `:1974-1987`
(the control + its "Phase 14 DELETES this" comment), `:2061-2083` (the three styles);
`src/runtime/GameScreen.tsx:207-222` (the slot).
**Apply to:** the `Daily` control.

```tsx
    typeof __DEV__ !== 'undefined' && __DEV__ ? ( … ) : null;
```

The `typeof` guard is not optional — `PlayingHost.tsx:1069` notes *"a bare `__DEV__` throws on a
runtime that does not define it."*

### Test-header states its analog and its non-coverage

**Source:** `tests/endless.ramp.test.ts:10-25`, `tests/storage.endless-firewall.test.ts:1-20`.
**Apply to:** all five new/modified test files.

Each header names the defect or criterion it exists for, the file whose shape it copied, and
what it deliberately does not cover so a reader does not mistake its silence for a passing
claim.

---

## The One Conflict — surfaced, not resolved

**The countdown's foreground refresh has nowhere to attach.** This is the planner's call; both
sides are mapped below so it is decided rather than discovered mid-execution.

**What the approved UI-SPEC commits to** (`12-UI-SPEC.md` § Clock policy in the UI, rule 4):

> **Refresh cadence:** on mount, on every `AppState` → `active`, and on a 60-second interval.

and rule 1, which extends the same trigger to the *playability* decision:

> Playability is evaluated only by D-01 … re-derived from a fresh local-date read on every
> render and on every foreground.

**What the shipped helper says** — `src/runtime/appStatePause.ts`, the entire file, re-read
today (26 lines):

```ts
/**
 * Subscribe to OS AppState for auto-pause (PLT-01 / D-15 / T-03-03).
 *
 * On `inactive` | `background` → invoke onAutoPause (freeze + accumulator reset).
 * On `active` → intentionally empty: never auto-resume physics.
 * Returning to foreground must stay frozen until Resume → countdown (Plan 05).
 */
export function subscribeAppStateAutoPause(handlers: {
  onAutoPause: () => void;
  /** Optional F-26: flush pending personal-best write on background. */
  onBackgroundFlush?: () => void;
}): NativeEventSubscription {
  return AppState.addEventListener('change', (next: AppStateStatus) => {
    if (next === 'inactive' || next === 'background') {
      handlers.onAutoPause();
      handlers.onBackgroundFlush?.();
    }
    // active: intentionally empty — never auto-resume (D-15)
  });
}
```

The `active` branch is not merely absent — its absence is asserted twice, in the JSDoc (`:11`)
and inline (`:24`), both citing D-15.

**Its only consumer**, and the shape any new subscription would mirror —
`src/runtime/useGameLoop.ts:760-779` (the only `AppState` touch point in the repo; a repo-wide
grep for `subscribeAppStateAutoPause` returns its definition and this one call site):

```ts
  // AppState auto-pause: freeze + resetAccumulator; never setActive(true) on foreground (D-15).
  // Returning to `active` stays frozen until Resume → countdown (Plan 05).
  // CERT harness skips OS pause — deep-link relaunch / screen glances must not kill the frame loop.
  const onOsPause = options.onOsPause;
  useEffect(() => {
    if (certMetricsLog) {
      return;
    }
    const sub = subscribeAppStateAutoPause({
      onAutoPause: () => {
        // setActive(false) also requests accumulator reset via handle contract
        setActive(false);
        uiPhase.value = UiPhaseNum.PAUSED;
        onOsPause?.();
      },
    });
    return () => {
      sub.remove();
    };
  }, [setActive, uiPhase, onOsPause, certMetricsLog]);
```

Note two things the second option would have to reckon with: this subscription is **skipped
entirely under `certMetricsLog`** (`:765-767`), and it lives in `useGameLoop`, which the daily
result panel outlives — the panel renders while no run is live.

**The two options, with what each costs:**

| Option | Shape | Cost |
|---|---|---|
| **A** — add `onForeground?: () => void` to `subscribeAppStateAutoPause` | one subscription; the `active` branch calls **only** the new optional callback and nothing physics-related, preserving the D-15 invariant in fact while contradicting the comment's letter | edits a file whose comment at `:11` and `:24` explicitly guards against an `active` branch; every future reader of those two comments must now reconcile them with the code; the helper's single existing consumer (`useGameLoop.ts:768`) gains a parameter it never passes |
| **B** — `DailyResultOverlay`'s host owns its own `AppState.addEventListener` | `appStatePause.ts` untouched, its comments stay literally true | two AppState subscriptions in one app; `app/` would import `react-native`'s `AppState` directly (legal — `PlayingHost.tsx` already imports from `react-native`) or a second `src/runtime` helper would be added beside the first; no shipped precedent for a second subscription, and no existing test harness for one |

**This is a task in either case, not an assumption.** A plan that says "refresh on foreground"
without naming A or B produces a silent no-op: there is no `active` callback to attach to today.

---

## No Analog Found

Files with a strong structural analog but **one sub-problem with no in-repo precedent**. These
are not "no analog" at the file level — every file above has one — but the planner should not
expect to copy these particular pieces from anywhere.

| File | Sub-problem | Why no analog |
|---|---|---|
| `src/services/daily/dateKey.ts` | local-calendar-date derivation | Nothing in the repo reads a *calendar* date. `Date.now()` appears only as an instant (`telemetry.ts:155`, `memoryStore.ts:112`, `PlayingHost.tsx:1375`). Use 12-RESEARCH § Finding 3's executed-probe code, which is the closest thing to an authority this phase has. |
| `tests/daily.dateKey.test.ts` | `process.env.TZ` pinning inside a test | No shipped test sets `TZ`. Verified to work under this project's `vitest` in 12-RESEARCH § Finding 5, but it is a new idiom here, not a copy. |
| `src/services/storage/telemetry.ts` | merging a record that holds **both** a max field (`longestStreak`) and a count (`totalDaysPlayed`) | `mergeEndlessRecords` (`:205-211`) is max-only; `mergeAggregates` (`:161-183`) does both but over a flat counter type, not a record with a bounded array beside it. D-16 needs a decision, not a copy. |
| `src/runtime/overlays/DailyResultOverlay.tsx` | a live 60s-interval timer inside an overlay | `CountdownOverlay.tsx` is the only timer-bearing overlay and it is driven by a host-supplied `numeral` prop, not by its own interval. The UI-SPEC's "derived, never accumulated" rule means the interval only forces a re-render — but nothing in `src/runtime` currently owns an interval. |
| `src/runtime/appStatePause.ts` | an `AppState → active` callback | See § The One Conflict. The branch is deliberately absent, so there is by construction nothing to copy. |

---

## Metadata

**Analog search scope:** `src/services/**`, `src/services/storage/**`, `src/services/endless/**`,
`src/runtime/**`, `src/runtime/overlays/**`, `src/levelgen/**`, `app/_components/**`,
`tests/**`, `tests/ui/**`, `docs/ops/**`, `eslint.config.js`
**Files read this session:** 24 (all `git ls-files`-verified as tracked source)
**Pattern extraction date:** 2026-09-27
