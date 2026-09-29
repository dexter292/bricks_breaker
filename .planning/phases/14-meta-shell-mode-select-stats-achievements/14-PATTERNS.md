# Phase 14: Meta Shell — Mode Select, Stats & Achievements - Pattern Map

**Mapped:** 2026-09-29
**Files analyzed:** 24 (7 new, 17 modified)
**Analogs found:** 22 / 24 (2 partial, 2 with no analog — see [§ No Analog Found](#no-analog-found))

> **Citation discipline.** Every line number below was re-`grep`ed against the working tree on
> 2026-09-29 and every quote is `sed`-extracted, not recalled. Where an upstream artifact cited a
> line that is not the line, the correction is stated inline — `14-RESEARCH.md` is off by 7 on the
> `sanitizeAchievementRecord` bound and gives three different ranges for the same `SelectScreen`
> read. This matters here because the planner's actions will quote these anchors.
>
> **Every path below is git-TRACKED** — verified with `git ls-files` over all 22 cited files.
> `.gsd/` is gitignored (`.gitignore:51`), and no analog in this map comes from it.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/_components/StatisticsScreen.tsx` **(new)** | screen component | read-once-on-mount | `app/_components/SelectScreen.tsx` | **exact** |
| `app/_components/AchievementsScreen.tsx` **(new)** | screen component | read-once + one write | `app/_components/SelectScreen.tsx` (shell + read); `src/runtime/overlays/LevelErrorOverlay.tsx` (scroll structure) | exact (shell) / **partial** (scroll) |
| `src/runtime/textScale.ts` **(new)** | config constant | n/a (pure module) | `src/runtime/constants.ts` (placement/shape); `src/runtime/overlays/achievementLines.ts:23-49` (derivation doc + reader enumeration) | role-match |
| `app/_components/TitleScreen.tsx` | screen component | props-in, static content | itself (lines 29-38 extend) + `SelectScreen.tsx:110-143` (`row`/`rowMeta` label+meta shape) | **exact** |
| `app/_components/GameHost.tsx` | router / state machine | state machine + read-once | itself — the shipped `'select'` early return (`:177-190`) and the shipped title effect (`:72-86`) | **exact (self)** |
| `app/_components/PlayingHost.tsx` | host controller | deletion + new prop | itself — `:2675-2683` / `:2699-2708` are the two blocks deleted; `:687` is the optional-method call shape | **exact (self)** |
| `app/_components/SelectScreen.tsx` | screen component | prop-only edit | `src/runtime/overlays/ResultOverlay.tsx:96-103` (multi-line `<Text>` prop placement) | role-match |
| `src/services/storage/types.ts` | model / type | schema | `AchievementRecord.unlocked` (`:387-396`) + `ACHIEVEMENT_UNLOCK_BOUND` (`:315`) + `defaultAchievementRecord` (`:447-449`) | **exact** |
| `src/services/storage/parseBlob.ts` | sanitizer (read path) | transform / validate | `sanitizeAchievementRecord` (`:644-679`) and `sanitizeAggregateMap` (`:681-711`) | **exact** |
| `src/services/storage/telemetry.ts` | pure merge/clone | transform | `cloneTelemetryBlob` (`:63-93`), `mergeAchievementRecords` (`:865-880`), `mergeAchievementUnlocks` (`:233-259`) | **exact** |
| `src/services/storage/memoryStore.ts` | store | CRUD (write tail) | itself — `:208-219`, the unlock-evaluation tail | **exact (self)** |
| `src/services/storage/asyncStorageStore.ts` | store | CRUD (write tail) | `memoryStore.ts:208-219` — hand-mirrored at `:497-511` | **exact** |
| `src/runtime/overlays/ResultOverlay.tsx` | overlay | prop-only edit | itself | prop-only |
| `src/runtime/overlays/DailyResultOverlay.tsx` | overlay | prop-only edit | `ResultOverlay.tsx` | prop-only |
| `src/runtime/overlays/PauseOverlay.tsx` | overlay | prop-only edit | `ResultOverlay.tsx` | prop-only |
| `src/runtime/overlays/CountdownOverlay.tsx` | overlay | prop-only edit | `ResultOverlay.tsx` | prop-only |
| `src/runtime/overlays/LevelErrorOverlay.tsx` | overlay | prop-only edit | `ResultOverlay.tsx` | prop-only |
| `src/runtime/HudStrip.tsx` | runtime chrome | prop-only edit | `ResultOverlay.tsx` | prop-only |
| `src/runtime/GameScreen.tsx` | runtime chrome | prop-only edit | `ResultOverlay.tsx` | prop-only |
| `tests/ui/StatisticsScreen.test.tsx` **(new)** | test (jsdom) | render + spy | `tests/ui/SelectScreen.test.tsx:1-51` | **exact** |
| `tests/ui/AchievementsScreen.test.tsx` **(new)** | test (jsdom) | render + spy | `tests/ui/SelectScreen.test.tsx:1-51`; subtree scoping from `tests/ui/PlayingHost.endless-record.test.tsx:285-288` | exact / **partial** |
| `tests/ui/textScale.gate.test.ts` **(new)** | test (source contract) | file scan | `tests/ui/achievementLines.test.ts:176-192` (comment strip) + `scripts/assert-no-disabled-tests.mjs:64-106` (self-check) | **exact** |
| `tests/ui/shellColorFences.test.ts` **(new)** | test (source contract) | file scan | same two as above | **exact** |
| `docs/ops/PROGRESS-STORAGE.md` / `docs/ops/ACHIEVEMENTS.md` | docs | n/a | `PROGRESS-STORAGE.md:111-116` (bounds table, add a 5th row); `ACHIEVEMENTS.md:576-600` (Limit 2b, becomes false) | **exact** |

---

## Pattern Assignments

### `app/_components/StatisticsScreen.tsx` (new — screen component, read-once-on-mount)

**Analog:** `app/_components/SelectScreen.tsx` — same tier, same role, same data flow, same
`onBack`-only control set. Copy it as the *whole file skeleton*, not just as a snippet source.

**Imports pattern** (`SelectScreen.tsx:1-12`, verbatim):

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LevelId } from '../../src/runtime/loadLevel';
import {
  PLAYABLE_LEVEL_ORDER,
  createDefaultProgressStore,
  defaultProgressBlob,
  selectRowState,
  type ProgressBlob,
  type ProgressStore,
} from '../../src/services/storage';
```

Note the conventions to keep: **relative `../../src/...` paths, no alias**; a **single barrel import
from `src/services/storage`** (`PLAYABLE_LEVEL_ORDER`, `ENDLESS_TELEMETRY_KEY`,
`DAILY_TELEMETRY_KEY`, `currentDailyStreak`, `defaultProgressBlob` and
`createDefaultProgressStore` are all exported from `src/services/storage/index.ts` at lines
10, 31, 35, 55, 83, 95 — do not deep-import a module file); `type`-prefixed type imports.

**Dependency-injection prop** (`SelectScreen.tsx:14-19` + `:43-46`) — this is the pattern that lets
the new test avoid `vi.mock`:

```tsx
type SelectScreenProps = {
  onBack: () => void;
  onChoose: (id: LevelId) => void;
  /** Optional inject for tests; default createDefaultProgressStore() */
  store?: ProgressStore;
};
...
  const store = useMemo(
    () => storeProp ?? createDefaultProgressStore(),
    [storeProp],
  );
```

`SelectScreen` is the **only** UI component in `app/` that takes a store prop, and
`tests/ui/SelectScreen.test.tsx` is the only UI test that does not `vi.mock` the storage barrel.
Copy it.

**Read-once core pattern** (`SelectScreen.tsx:47-64`, verbatim — *not* `:48-66` or `:52-66`, both of
which `14-RESEARCH.md` quotes):

```tsx
  const [progress, setProgress] = useState<ProgressBlob>(() =>
    defaultProgressBlob(),
  );

  useEffect(() => {
    let cancelled = false;
    void store
      .getSnapshot()
      .then((snap) => {
        if (!cancelled) setProgress(snap);
      })
      .catch(() => {
        if (!cancelled) setProgress(defaultProgressBlob());
      });
    return () => {
      cancelled = true;
    };
  }, [store]);
```

**Error handling pattern:** the `.catch()` **is** the whole of the error contract. There is no
error state, no boundary, no banner — the catch arm re-sets the same defaults the initializer
produced. Grep confirms: zero `ErrorBoundary`, zero error-copy strings on any shell screen.

**Shell-contract pattern** (`SelectScreen.tsx:66-78`) — the `#1a1a2e` root with all four insets
applied as inline padding over the `StyleSheet` root, then a `content` view carrying the
horizontal padding:

```tsx
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
      <View style={styles.content}>
```

with `styles.root = { flex: 1, backgroundColor: '#1a1a2e' }` and
`styles.content = { flex: 1, paddingHorizontal: 24, paddingTop: 8 }` (`:190-198`). Identical in
`TitleScreen.tsx:17-28` / `:45-54` and in `LevelErrorOverlay.tsx:17-28`. **All four insets, always
— never just top.**

**`Back` control pattern** (`SelectScreen.tsx:79-86` + styles `:199-217`) — reuse verbatim, both
screens:

```tsx
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to title"
          onPress={onBack}
          style={styles.backButton}
        >
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
```

`backButton`: `alignSelf: 'flex-start', minHeight: 44, minWidth: 44, paddingHorizontal: 16,
paddingVertical: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e',
borderWidth: 1, borderColor: '#FFFFFF'`. `backLabel`: `color '#FFFFFF', fontFamily 'SpaceMono',
fontSize 14, fontWeight '400', lineHeight 20`.

**Row pattern for every lifetime / `By mode` row** (`SelectScreen.tsx:231-259`) — this is the
"single label, optional right-aligned meta" shape the UI-SPEC § Layout rules names:

```tsx
  row: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: { color: '#FFFFFF', fontFamily: 'SpaceMono', fontSize: 16, fontWeight: '400', lineHeight: 24 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 16 },
```

**Heading pattern** (`SelectScreen.tsx:218-226`): `fontSize: 20, fontWeight: '600', lineHeight: 24`
— note the shipped `marginTop: 32`, which the UI-SPEC budget replaces with `24` for the two new
screens. Take the type values, not the margin.

**Level labels and order — do not re-derive.** `SelectScreen.tsx:21-27` holds the map; import or
duplicate is a decision, but a *second mapping* is forbidden (`14-RESEARCH.md` § Don't Hand-Roll):

```tsx
const LEVEL_LABEL: Record<(typeof PLAYABLE_LEVEL_ORDER)[number], string> = {
  'level-01': 'Level 01',
  'level-03': 'Level 03',
  'level-04': 'Level 04',
  'level-05': 'Level 05',
  'level-06': 'Level 06',
};
```

`LEVEL_LABEL` is **not exported** today (`SelectScreen.tsx:21`, module-local `const`). Exporting it
is the cheapest way to satisfy "one mapping"; the planner must say which.

**Colour to NOT copy.** `SelectScreen.tsx:246-248` — `muted: { color: '#6B7280' }`, used at `:112`,
`:116`, `:180` and `:275`. `14-UI-SPEC.md` § Color fence 1 forbids `#6B7280` on all three screens
(3.53:1 on `#1a1a2e`, fails AA). The row *layout* above is the right analog; this colour is the
wrong one. `tests/ui/shellColorFences.test.ts` exists to hold that line.

---

### `app/_components/AchievementsScreen.tsx` (new — screen component, read-once + one write)

**Shell / read / `Back` analog:** identical to `StatisticsScreen` above — `SelectScreen.tsx`.
Everything in the preceding section applies unchanged.

#### Scroll structure — the analog IS present, and it is partial. Here is exactly how far it reaches.

**`src/runtime/overlays/LevelErrorOverlay.tsx:29-41` is the only place in `src/` or `app/` that
puts anything outside a scrolling subtree.** It is the only `ScrollView` in the whole tree
(`grep -rn "ScrollView\|FlatList\|SectionList" src app tests` → 4 hits, all in that one file; zero
`FlatList`, zero `SectionList`):

```tsx
      <View style={styles.panel}>
        <Text style={styles.heading}>Level Error</Text>
        <Text style={styles.body}>Invalid level — gameplay blocked</Text>
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
        >
          {issues.map((issue, i) => (
            <Text key={`${issue.path}-${i}`} style={styles.issue}>
              {`${issue.path}: ${issue.message}`}
            </Text>
          ))}
        </ScrollView>
      </View>
```

**What this analog gives you, exactly:**

- The *structure* the UI-SPEC's § S3 condition 1 requires — fixed header nodes as **preceding
  siblings** of the `ScrollView` inside a single parent `View`, not wrapped, not absolutely
  positioned, not a sticky header prop.
- `style` sizes the scroll viewport and `contentContainerStyle` carries the inner spacing —
  `styles.listContent = { gap: 8 }` (`:83-85`). For S3 that is `gap: 16` plus `paddingBottom: 24`.

**What this analog does NOT give you — say so in the plan rather than inferring it:**

1. **No control has ever sat outside a `ScrollView` in this repo.** `LevelErrorOverlay` renders
   **zero** `Pressable` nodes; its own JSDoc says so — *"No Retry/play controls: host must fix data
   or switch levels in `__DEV__`"* (`:12`). The UI-SPEC's contract is that **`Back` is in the fixed
   header**, and there is no in-repo precedent for a fixed `Pressable` beside a scroll. The
   structure transfers; the reachability claim does not, and that is precisely why UI-SPEC
   backstop 4 is human-only.
2. **The viewport sizing is a panel idiom, not a screen idiom.** `styles.list = { maxHeight: 240 }`
   (`:80-82`) inside `panel { maxHeight: '80%' }` (`:54-61`). A full-screen scroll under a fixed
   header needs `flex: 1` on the `ScrollView`, and **no `flex: 1` `ScrollView` exists in this
   tree.** Do not copy `maxHeight: 240`.
3. `LevelErrorOverlay`'s heading is `#E85D5D` (`:63`) — **forbidden** on this screen (UI-SPEC
   § Color fence 3). Copy the structure, not the colour.

#### Read-plus-freeze core pattern

The read is `SelectScreen.tsx:47-64` verbatim, **plus one more piece of state that must not be
derived from the snapshot**. There is no in-repo analog for "freeze a value at the moment of the
read and keep rendering from it after the source is cleared" — see [§ No Analog Found](#no-analog-found).
`14-RESEARCH.md` § Code Examples has the intended shape; it is a research example, not shipped code.

#### Optional-store-method call — the analog IS shipped

`markAchievementsSeen?.()` is a new optional member on `ProgressStore`. The optional-member
precedent and its host-side call are both shipped:

`src/services/storage/types.ts:629-648` — the interface, with `flush` already optional:

```ts
export interface ProgressStore {
  getBest(): Promise<number>;
  ...
  getSnapshot(): Promise<ProgressBlob>;
  flush?(): Promise<void>;
}
```

`app/_components/PlayingHost.tsx:687` — the fire-and-forget call shape, verbatim:

```tsx
    void store.flush?.().catch(() => {});
```

**Use this form, not a bare `void store.markAchievementsSeen?.()`.** The shipped line swallows the
rejection too; the UI-SPEC § Error states row *"The seen-state write fails on Achievements exit →
the marks reappear on the next open"* requires exactly that swallow. The reason the `?.` is
mandatory is recorded verbatim at `types.ts:607-616`: five test files build their store as a bare
object literal inside a `vi.mock` factory and are therefore **not** contextually typed as
`ProgressStore`, so they hand the host `undefined` at runtime.

#### Catalog read pattern

`ACHIEVEMENT_CATALOG` is `readonly Achievement[]` declared at
`src/services/achievements/catalog.ts:321`, entries shaped `{ id, name, description, … }`. Import
from the barrel, `src/services/achievements/index.ts:3-10`:

```ts
export {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_NAME_MAX,
  isKnownAchievementId,
  type Achievement,
  ...
} from './catalog';
```

Map over `ACHIEVEMENT_CATALOG` directly — declaration order, no sort, no filter (D-10). Render
`a.name` / `a.description`, **never** a stored string (T-13-01).

---

### `src/services/storage/*` — the new persisted `unseen` field (model + sanitizer + merge + 2 stores)

#### The shape analog: `unlocked` and its bound

`src/services/storage/types.ts:387-396` — the record and the JSDoc paragraph the new field must
match in kind:

```ts
export type AchievementRecord = {
  /**
   * Earned achievements, one entry per id. Bounded on write by
   * `ACHIEVEMENT_UNLOCK_BOUND`; the read bound and the unknown-id drop are plan 13-03's.
   *
   * An ARRAY of entries, deliberately not a map keyed by id: `sanitizeAggregateMap`
   * (`parseBlob.ts`) is the counter-example living one file away, copying every key it
   * finds on read with no cap forever.
   */
  unlocked: AchievementUnlock[];
};
```

`src/services/storage/types.ts:315` — the bound the new field reuses (do not mint a second
constant; `ACHIEVEMENT_UNLOCK_BOUND` is `64 as const` and its JSDoc at `:288-314` already says
*"64 is more than five times D-09's largest catalog and leaves Phase 14 and beyond room without a
bound edit"*):

```ts
export const ACHIEVEMENT_UNLOCK_BOUND = 64 as const;
```

**Site 1 — the default** (`types.ts:447-449`, and the reason it is reachable, `:450-462`):

```ts
/** Empty achievement record — nothing has been earned yet. */
export function defaultAchievementRecord(): AchievementRecord {
  return { unlocked: [] };
}
```

```ts
    // Reachable from here is what makes D-13's no-migration claim TRUE rather than
    // intended: `sanitizeTelemetry` starts from this value, so a v4 blob written before
    // the field existed parses with it defaulted and no `v` bump.
    achievements: defaultAchievementRecord(),
```

**Site 2 — the clone** (`telemetry.ts:63` declaration; the achievements arm at `:78-90`). The
comment in place is itself the spec for the edit, quoted verbatim:

```ts
    // D-23's site, and the worst case in this file's three-site trap. `mergeEndlessRecord`
    // and `mergeDailyRecord` both START here, so a field missing from this clone is
    // dropped on EVERY other mode's run-end write — a campaign run would erase the unlock
    // set, silently, with no test naming the function that did it.
    //
    // The compiler catches THIS one: adding a required `achievements` field to
    // `TelemetryBlob` reds exactly this line, `mergeTelemetryBlobs` below and
    // `defaultTelemetryBlob` in `types.ts`, all `error TS2741` (MEASURED against this tree
    // before the field landed). ...
    achievements: {
      unlocked: t.achievements.unlocked.map((e) => ({ ...e })),
    },
```

`unseen` is a `string[]` of primitives, so the clone arm is `unseen: [...t.achievements.unseen]`
— the `.map((e) => ({ ...e }))` shape is for entry objects and does not transfer.

**Site 3 — the reconcile** (`telemetry.ts:865-880`), and the *reason no inversion rule is needed*
is already argued in the same file at `:834-837`:

```ts
function mergeAchievementRecords(
  a: AchievementRecord,
  b: AchievementRecord,
): AchievementRecord {
  const byId = new Map<string, AchievementUnlock>();
  for (const e of [...a.unlocked, ...b.unlocked]) {
    const prior = byId.get(e.id);
    // Earliest wins — the inversion of `mergeDailyRecords`' incoming-wins tiebreak, for
    // the D-14 reason above. Whole entries, never a per-field reduce across the set.
    if (prior == null || safeCounter(e.at) < safeCounter(prior.at)) {
      byId.set(e.id, { ...e, at: safeCounter(e.at) });
    }
  }
  return { unlocked: [...byId.values()].slice(0, ACHIEVEMENT_UNLOCK_BOUND) };
}
```

Called from `mergeTelemetryBlobs` (`telemetry.ts:882`) at `:905-908`, under:

```ts
    // The second of D-23's three sites. Missing here, the unlock set is lost on every
    // memory/disk reconcile — i.e. on every cold start that hydrates after a write. The
    // compiler forces this line (`TS2741`), measured; ...
```

For `unseen` the analog is the **id-set half**, not the timestamp half — a `Set` union then
`slice(0, ACHIEVEMENT_UNLOCK_BOUND)`, on the file's own argument at `:834-837`: *"For the ID SET it
does not recur. An id is its own evidence; the union of two id sets cannot inflate, and there is
no claim/evidence pair to cross."*

**The write-bound analog** (`telemetry.ts:233-259`), for `markAchievementsUnseen`:

```ts
export function mergeAchievementUnlocks(
  telemetry: TelemetryBlob,
  ids: readonly string[],
  atMs: number,
): TelemetryBlob {
  const next = cloneTelemetryBlob(telemetry);
  if (!Array.isArray(ids) || ids.length === 0) {
    return next;
  }
  ...
  next.achievements = {
    // Bound on write (D-15's direction, T-13-02's fence). `slice(0, …)` and NOT
    // `slice(-…)`: the recent-run ring keeps the NEWEST because it is a window on recent
    // activity, whereas an unlock is permanent (D-17) and dropping the oldest would
    // un-earn the achievements the player has held longest.
    unlocked: unlocked.slice(0, ACHIEVEMENT_UNLOCK_BOUND),
  };
  return next;
}
```

Clone-then-mutate-the-clone, `Array.isArray` guard, early return on empty, `slice(0, …)`.

#### Site 4 — `sanitizeAchievementRecord`, the one `tsc` cannot see

`src/services/storage/parseBlob.ts:644-679`. This is the function that gains the `unseen` read
path, and the compiler will **not** red it: `out` starts from the default and `record.unseen` is
simply never consulted, so a missing read path typechecks and the field reads `[]` forever.

```ts
function sanitizeAchievementRecord(raw: unknown): AchievementRecord {
  const out = defaultAchievementRecord();
  if (raw == null || typeof raw !== 'object') {
    return out;
  }
  const record = raw as { unlocked?: unknown };
  if (!Array.isArray(record.unlocked)) {
    return out;
  }
  const byId = new Map<string, AchievementUnlock>();
  for (const item of record.unlocked) {
    const entry = sanitizeAchievementUnlock(item);
    if (entry == null) {
      continue;
    }
    const prior = byId.get(entry.id);
    // Earliest wins (D-22). ...
    if (prior == null || entry.at < prior.at) {
      byId.set(entry.id, entry);
    }
  }
  // Bound on read as well as on write — a tampered blob cannot grow the collection —
  // applied AFTER the drop loop, never before.
  ...
  out.unlocked = [...byId.values()].slice(0, ACHIEVEMENT_UNLOCK_BOUND);
  return out;
}
```

**Correction to an upstream citation:** `14-RESEARCH.md` gives this function as
`parseBlob.ts:644-672` with *"the `slice(0, ACHIEVEMENT_UNLOCK_BOUND)` at line 670"*. The
declaration is at **644**, the `slice` is at **677**, the function ends at **679**. The
`record.unlocked` non-array early return is at `:651-653`.

Its three-step order is stated as contract in the JSDoc at `:605-611`, and the new field owes the
same one:

```
 *  1. **Drop** per entry — an unknown id is gone, a malformed timestamp is zeroed (D-21).
 *  2. **De-duplicate** by id, keeping the EARLIEST `at`.
 *  3. **Bound**, after both.
```

with the reason at `:613-617`: *"trimming first would let padding garbage push real unlocks out of
the window, which is the opposite of what the bound exists for."*

**The bounded-keep-first sanitizer analog for a flat `string[]` — `sanitizeAggregateMap`**
(`parseBlob.ts:681-711`). Quote it in the plan, because it is the one that applies the bound as a
**counter over survivors** rather than a `slice` over a `Map`, which is the shape a `string[]`
field with a per-id drop wants:

```ts
function sanitizeAggregateMap(
  raw: unknown,
): Partial<Record<string, TelemetryAggregate>> {
  const out: Partial<Record<string, TelemetryAggregate>> = {};
  if (raw == null || typeof raw !== 'object') {
    return out;
  }
  const map = raw as Record<string, unknown>;
  // Bounded on READ (WINDOWS #27 / T-09-A1), and the bound is applied to the SURVIVING
  // keys — after the non-object drop below, never to `Object.keys(map)` before it, so
  // padding garbage cannot push a real level's aggregate out of the window. Same
  // drop-then-trim order, for the same reason, as `sanitizeAchievementRecord` above.
  ...
  let kept = 0;
  for (const key of Object.keys(map)) {
    const entry = map[key];
    if (entry == null || typeof entry !== 'object') {
      continue;
    }
    if (kept >= AGGREGATE_MAP_BOUND) {
      break;
    }
    out[key] = sanitizeAggregate(entry);
    kept += 1;
  }
  return out;
}
```

**The order is drop → bound, and the `break` sits AFTER the `continue`.** That ordering is
deliberate and is stated in the comment. Copy both the order and the placement.

> **Stale comment to be aware of.** `parseBlob.ts:670-673` still reads *"`sanitizeAggregateMap`
> below has NO key cap and copies every key it finds on every parse."* That is **false as of the
> `AGGREGATE_MAP_BOUND` landing** — the cap is at `:705-707`.
>
> **Orchestrator check, 2026-09-29: `types.ts:319-321` is NOT drifted and must not be "fixed".**
> Read in full it is deliberately past-tense history — *"**Why this exists, and why it did not until
> now.** `sanitizeAggregateMap` in `parseBlob.ts` **copied** EVERY key it found … with no bound"* —
> which is a true account of the state the constant was added to repair. Only the
> `parseBlob.ts:670-673` claim is present-tense and therefore false. Correcting the wrong one of
> these two would delete the only record of why the bound exists.
> Neither is this phase's to fix, but do not plan against the prose.

**The field-by-field assign that makes D-13 true** (`parseBlob.ts:746-781`), the caller:

```ts
function sanitizeTelemetry(raw: unknown): TelemetryBlob {
  const out = defaultTelemetryBlob();
  ...
  out.achievements = sanitizeAchievementRecord(telemetry.achievements);
```

#### The two store write tails — hand-mirrored, and both must change

`src/services/storage/memoryStore.ts:208-219` (the analog; `args.outcome` is in scope here):

```ts
      const newlyUnlocked = newlyUnlockedAchievements(
        blob.telemetry,
        blob.telemetry.achievements.unlocked.map((e) => e.id),
      );
      if (newlyUnlocked.length > 0) {
        blob.telemetry = mergeAchievementUnlocks(
          blob.telemetry,
          newlyUnlocked,
          Date.now(),
        );
        blob.updatedAt = Date.now();
      }
```

`src/services/storage/asyncStorageStore.ts:497-511` — the mirror, and note it is **immutable
spread** where the memory store mutates in place:

```ts
      const newlyUnlocked = newlyUnlockedAchievements(
        memory.telemetry,
        memory.telemetry.achievements.unlocked.map((e) => e.id),
      );
      if (newlyUnlocked.length > 0) {
        memory = {
          ...memory,
          telemetry: mergeAchievementUnlocks(
            memory.telemetry,
            newlyUnlocked,
            Date.now(),
          ),
          updatedAt: Date.now(),
        };
      }
```

The two are **not** copy-paste identical. A plan action that says "apply the same edit to both
stores" must state both forms.

**The outcome gate to copy** (`app/_components/PlayingHost.tsx:1232-1240`) — the identical gate,
one function away, for the identical reason:

```tsx
      // RunEndedPayload is deliberately a win/lose concept: abandoning to the Menu is
      // telemetry, not a monetization beat. ...
      if (outcome !== 'abandoned') {
```

**Do not double-hydrate.** `asyncStorageStore.ts:331-342` is the JSDoc that makes the singleton
mandatory for both new screens:

```
   * Single-flight. `hydrateOnce` folds the disk blob into memory with
   * `mergeHighWatermark`, whose telemetry half SUMS lifetime counters — so
   * running it twice against the same disk blob would double every counter and
   * the next `persist` would write the inflated values back permanently.
```

---

### `app/_components/GameHost.tsx` (router / state machine + the read-once telemetry read)

**Analog: itself.** Both edits extend shipped code in place.

#### The read-once-on-title-mount read — the exact code, and what form it is NOT

`app/_components/GameHost.tsx:72-86`, verbatim. **This is the analog for both new screens'
`getSnapshot()` read and for Title's widened three-value read.**

```tsx
  useEffect(() => {
    if (shellPhase !== 'title') return;
    let cancelled = false;
    void store
      .getBest()
      .then((b) => {
        if (!cancelled) setBest(b);
      })
      .catch(() => {
        if (!cancelled) setBest(0);
      });
    return () => {
      cancelled = true;
    };
  }, [shellPhase, store]);
```

with `const [best, setBest] = useState(0);` at `:67` and
`const store = useMemo(() => createDefaultProgressStore(), []);` at `:70` (under the comment
*"F-26: same ProgressStore singleton as PlayingHost — Title rollup matches max."*).

**Stated explicitly, because `react-hooks/set-state-in-effect` is severity `error` in this repo:**

| Form | Is that what the shipped code does? |
|---|---|
| `useState` **initializer** producing the read value | **No.** `:67` is `useState(0)` — a plain literal, not a lazy initializer. It cannot be the initializer: `getBest()` / `getSnapshot()` return a `Promise`, so no synchronous initializer can produce the value. |
| `useEffect` with a **synchronous** `setState` in the effect body | **No — and this form is a build failure.** `react-hooks/set-state-in-effect` is `[2]`; `14-RESEARCH.md` § Pitfall 1 pastes the probe output and reports that guarding on state does not silence it and guarding on a ref only relocates the error to `react-hooks/refs`. |
| `useEffect` whose `setState` lives inside a **`.then()` callback** | **Yes. This is it.** `setBest` at `:78` and `:81` are both inside promise callbacks. That is the only reason the shipped line is lint-legal. |
| `useSyncExternalStore` | Not used anywhere. `getSnapshot()` is `async` and the store exposes no `subscribe` — verified: zero `subscribe` in `src/services/storage/**`. |

Three structural properties to preserve on every copy: the **phase gate first** (`if (shellPhase
!== 'title') return;`), the **`cancelled` latch** with its cleanup, and the **`.catch()` → default**
arm. `SelectScreen.tsx:51-64` is the same three minus the phase gate.

**The clock read, if Title's widened effect needs one.** Read `Date.now()` *inside* the effect
body — never in the render body. `react-hooks/purity` is `[2]` and rejects the render-body form
(`14-RESEARCH.md` § Pitfall 2 pastes the probe). `PlayingHost.tsx:1941-1942` is the shipped
precedent:

```tsx
    const nowMs = Date.now();
    const dateKey = localDateKey(nowMs);
```

#### The early-return branch pattern — two new `ShellPhase` arms

`GameHost.tsx:13` is the union to widen:

```tsx
type ShellPhase = 'title' | 'select' | 'playing';
```

`GameHost.tsx:177-190` is the branch shape to copy twice, **above** the final return:

```tsx
  if (shellPhase === 'select') {
    return (
      <View style={styles.root}>
        {harnessAwake}
        <SelectScreen
          onBack={() => setShellPhase('title')}
          onChoose={(id) => {
            setActiveLevelId(id);
            setShellPhase('playing');
          }}
        />
      </View>
    );
  }
```

`{harnessAwake}` is computed once at `:162-166` and appears in **every** branch — including the
two new ones. The final `PlayingHost` return is `:192-201`; it stays last, which is the whole of
SC-5's mechanism.

**The invariant note to extend** (`GameHost.tsx:88-90`):

```tsx
  // DEV soak: 100 Title↔Playing mounts then 15 min continuous (D-19…D-23).
  // Discrete setTimeout only — never useFrameCallback / per-frame work.
  // D-01: only 'title' | 'playing' — never 'select'.
```

and the **shipped source-contract case that already guards it**,
`tests/ui/GameHost.test.tsx:117-132` — extend this, do not write a new one:

```tsx
  it('CERT/SOAK source: initial playing when CERT; soak never sets select', () => {
    const code = readFileSync(
      resolve(__dirname, '../../app/_components/GameHost.tsx'),
      'utf8',
    );
    expect(code).toMatch(
      /CERT_HARNESS && !SOAK_HARNESS \? 'playing' : 'title'/,
    );
    expect(code).toMatch(/setShellPhase\('select'\)/);
    // Soak effect bodies only title|playing — no select in setShellPhase soak paths
    const soakMatch = code.match(
      /if \(typeof __DEV__[\s\S]*?SOAK_HARNESS\)[\s\S]*?return \(\) => \{[\s\S]*?\n  \}, \[\]\);/,
    );
    expect(soakMatch).toBeTruthy();
    expect(soakMatch![0]).not.toMatch(/setShellPhase\('select'\)/);
  });
```

---

### `app/_components/TitleScreen.tsx` (screen component, props-in)

**Analog: itself for the shell, `SelectScreen.tsx` for the new rows.**

The whole body to extend (`TitleScreen.tsx:28-39`) — three `<Text>`/`Pressable` nodes becoming
seven rows:

```tsx
      <View style={styles.content}>
        <Text style={styles.brand}>{DISPLAY_NAME}</Text>
        <Text style={styles.best}>{`Best · ${best}`}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start game"
          onPress={onPlay}
          style={styles.playButton}
        >
          <Text style={styles.playLabel}>Play</Text>
        </Pressable>
      </View>
```

**Brand is never a literal** — `import { DISPLAY_NAME } from '../_brand';` (`:3`), gated by
`scripts/assert-brand-name.mjs`.

**The filled mode-entry treatment is the shipped `playButton` / `playLabel`**
(`TitleScreen.tsx:72-88`), with the **`marginTop: 64` → `24`/`16`** change the UI-SPEC budget makes
(the `3xl` token is the removal candidate):

```tsx
  playButton: {
    marginTop: 64,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  playLabel: {
    color: '#1a1a2e',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
```

Note the inverted colour pair: `#FFFFFF` fill, `#1a1a2e` label. That is UI-SPEC § Color row 1's
*"the text colour inside the three filled mode entries."*

**The outlined secondary-entry treatment is `SelectScreen`'s `backButton`/`backLabel`**
(`SelectScreen.tsx:199-217`, quoted above) — `borderWidth: 1` + `#1a1a2e` fill + Label 14. The
UI-SPEC's 46 pt secondary row is exactly that box.

**The label + right-aligned meta shape** (for `Daily` → `done · Streak {n}` and `Achievements` →
`{n} new`) is `SelectScreen.tsx:110-143` with `styles.row` / `styles.rowMeta` (`:231-259`) — the
`justifyContent: 'space-between'` row with a `rowMeta` view at `gap: 16`. The mode entries are
`Pressable`s, so the meta goes *inside* the `Pressable`, as `SelectScreen`'s does.

**Accessibility-label convention** (`SelectScreen.tsx:100-105`): `accessibilityRole="button"` plus a
sentence-shaped `accessibilityLabel` that is **not** the visible text —
``locked ? `${label} locked` : `Play ${label}` ``. `PlayingHost.tsx:2716-2718` shows the same rule
applied to a bare readout: *"a bare `W17` reads as nonsense to a screen reader."*

**Shipped test that breaks.** `tests/ui/TitleScreen.test.tsx:26` queries
`getByRole('button', { name: 'Start game' })`, and the same query appears in
`tests/ui/GameHost.test.tsx`. A seven-row Title removes `Play`. Both must be fixed in the same
task that changes the component, or the suite reds.

---

### `app/_components/PlayingHost.tsx` (host controller — two deletions + an entry-mode prop)

**Analog: itself. Both deletions are marked in the source with their own Phase-14 notes.**

**Deletion 1 — the `Endless` control** (`:2670-2683`). The comment names the wave readout too:

```tsx
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

**Deletion 2 — the `Daily` control** (`:2684-2708`), comment at `:2684-2698`, `Pressable` at
`:2699-2708`.

**The wave readout** (`:2713-2719`) — the third `<Text>`:

```tsx
        {mode === 'endless' ? (
          <Text
            accessibilityLabel={`Wave ${wave}`}
            style={styles.devReadout}
          >{`W${wave}`}</Text>
        ) : null}
```

**The `<Text>` census, measured 2026-09-29** — `grep -n '<Text' app/_components/PlayingHost.tsx`
returns **7** lines: `:2648`, `:2659`, `:2668`, `:2682`, `:2707`, `:2715`, `:2733`. Deleting the
`Endless` label (`:2682`), the `Daily` label (`:2707`) and the wave readout (`:2715`) leaves
**4**. This confirms `14-UI-SPEC.md`'s correction ("three deleted, not two") against its own
earlier table.

**The dependency array that must stay on one line** — `PlayingHost.tsx:1247`, with the reason
directly above it at `:1242-1246`:

```tsx
    // Kept on ONE line, and the first three kept in order: the source-contract extractor
    // in `tests/ui/PlayingHost.endless-host.test.ts` anchors on `\n    [platform, store,
    // levelId[^\]]*\],` to slice this callback's body out. It tolerates ADDITIVE growth
    // by design; breaking the literal across lines reds five of its cases at once, none
    // of which is about dependencies.
    [platform, store, levelId, publishDailyPanel, publishUnlockedAchievements],
```

The anchor in the test, at `tests/ui/PlayingHost.endless-host.test.ts:125` (and again at `:175`,
`:247`, `:340`, `:506` — **five** call sites, matching the comment's claim):

```ts
      /const handleRunEnded = useCallback\(([\s\S]*?)\n {4}\[platform, store, levelId[^\]]*\],/,
```

**D-06 needs no new code — the read-only branch is `:1959-1993`**, inside
`startDailyRun = useCallback(() => {` at `:1928`. Its guard:

```tsx
    if (hasResultFor(dailyRecordRef.current.history.map((e) => e.date), dateKey)) {
```

and its terminal state at `:1985-1992`: `runEndedRef.current = true; setUiPhase('playing');
setResult(stored?.outcome ?? 'win'); setActive(false); return;`. `setUnlockedAchievementNames([])`
at `:1981` is the phase-13 WR-01 neutralisation. **Route the Daily tap into this function
unchanged.**

**The readiness gate the entry-mode dispatch must depend on** — `:1996-2006`:

```tsx
    if (!levelReady || levelError != null || !fxReady) {
      // Do NOT enter daily. Nothing is written, no board is swapped, `modeRef` is not
      // flipped, and the date therefore stays OPEN (D-01) ...
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.error('[daily] entry blocked: level or fx not ready');
      }
      return;
    }
```

(There are **seven** `!levelReady || levelError != null || !fxReady` guards in this file — `:1631`,
`:1767`, `:1996`, `:2115`, `:2357`, `:2609`. The daily one is `:1996`.)

**The comment that predicts the prop** — `:284-290`:

```tsx
  /**
   * Endless mode (N-END-01 / D-10) is HOST-LOCAL state: entered by the `__DEV__`
   * entry on the dev row, never threaded down from `GameHost`. D-05 makes the
   * entry temporary and Phase 14 replaces it with the real Title route, so the
   * shell plumbing that a `mode` prop would build is plumbing Phase 14 would
   * immediately have to unpick.
```

**Deferred-dispatch precedent.** `setTimeout(… , 0)` + `clearTimeout` cleanup is shipped in
`GameHost.tsx:98-105` (`schedule`) — a `cancelled` latch, a timer array, and a cleanup that clears
every id (`:150-155`). It is the closest in-repo shape for the once-only entry dispatch; the
`useRef` once-only latch is `runEndedRef` (`PlayingHost.tsx`, guarded shape asserted at
`tests/ui/PlayingHost.endless-host.test.ts:754`):

```ts
      /if \(!runEndedRef\.current\) \{\s*runEndedRef\.current = true;\s*handleRunEnded\(/;
```

---

### `src/runtime/textScale.ts` (new — pure config constant)

**Placement analog:** `src/runtime/constants.ts` — 23 lines, **zero imports**, one-line JSDoc per
export, no React:

```ts
/** Fixed simulation step (seconds). */
export const FIXED_DT = 1 / 120;

/** Cap substeps per frame to avoid spiral-of-death. */
export const MAX_SUBSTEPS = 5;
```

Seven files in `src/runtime/*.ts` have zero imports; `constants.ts` and `substepCap.ts` are the
two smallest.

**Derivation-doc analog:** `src/runtime/overlays/achievementLines.ts:23-49` — a constant whose
JSDoc carries the arithmetic, the measurement status, and the "this clamps / downward only"
contract:

```ts
/**
 * The hard cap on rendered unlock lines (D-05, AMENDED to two on measured grounds).
 *
 * The binding case is a campaign WIN on `ResultOverlay`: 48 pad + 40 heading + 40 body +
 * 32 Score + 32 Best + 32 stars + 44 badge + 64 Retry + 64 Next + 62 Menu = 458px, against
 * 548px usable at 320x568pt. ...
 *
 * ## This constant CLAMPS the output — downward only
 *
 * It is applied as a `slice` on the returned array, not merely described by the branch
 * table below, because the phase-13 code review found it was read by nothing in
 * production: ...
 */
export const ACHIEVEMENT_LINES_MAX = 2;
```

**That file is also the cautionary analog.** Its production reader is exactly one line,
`achievementLines.ts:158`:

```ts
  return laid.slice(0, ACHIEVEMENT_LINES_MAX);
```

`grep -n ACHIEVEMENT_LINES_MAX src/runtime/overlays/achievementLines.ts` → **4** hits: the
declaration at `:49`, two prose mentions at `:65` and `:82`, and that one reader. Before `99afd8b`
the reader did not exist. `MAX_FONT_SCALE`'s three gate assertions exist because of this.

**Import legality:** `eslint.config.js:390-400` — the `app` element (`pattern: 'app/**'`, `:345`)
is allowed to import `runtime` (`pattern: 'src/runtime/**'`, `:343`), and `runtime → runtime` is
allowed at `:371-379`. `npm run lint` is the **only** observer of this; no unit test covers it.

**Prop-placement analog for the 12 consumer files** — `ResultOverlay.tsx:96-103`, a multi-line
`<Text>` whose props precede `style`:

```tsx
        <Text
          key={i}
          style={[
            styles.starGlyph,
            g.filled ? styles.starFilled : styles.starEmpty,
          ]}
        >
          {g.glyph}
        </Text>
```

Single-line `<Text style={styles.metric}>Score · {score}</Text>` nodes (`:209`, `:211`) become
two-line. **Whichever formatting the executor picks, assertion 1 counts `<Text` occurrences with
`grep -o`, not lines** — see § Pitfall 4's warning that `grep -c` counts lines.

---

### `tests/ui/StatisticsScreen.test.tsx` / `tests/ui/AchievementsScreen.test.tsx` (new — jsdom)

**Analog:** `tests/ui/SelectScreen.test.tsx:1-51`. Copy the whole preamble.

```tsx
/**
 * N-LVL-02 — SelectScreen three-state list + mount snapshot (C2 Plan 02).
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { SelectScreen } from '../../app/_components/SelectScreen';
import {
  defaultTelemetryBlob,
  type ProgressBlob,
} from '../../src/services/storage';

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

afterEach(cleanup);

function snapshot(partial: Partial<ProgressBlob> = {}): ProgressBlob {
  return {
    v: 4,
    unlocked: ['level-01'],
    bestByLevel: {},
    bestScore: 0,
    updatedAt: 0,
    telemetry: defaultTelemetryBlob(),
    ...partial,
  };
}
```

Four load-bearing conventions: **`createElement`, never JSX** in these files;
`vi.mock('react-native-safe-area-context', …)` repeated **per file** (`14-RESEARCH.md` is explicit:
copy it, do not extract it, or 21 files change for one refactor); `afterEach(cleanup)`; a local
`snapshot()` factory built on `defaultTelemetryBlob()`.

**The DI + counting-spy pattern** (`SelectScreen.test.tsx:39-51`) — this is the "reads once"
instrument N-STAT-03 needs:

```tsx
  it('mount calls getSnapshot', async () => {
    const getSnapshot = vi.fn(() => Promise.resolve(snapshot()));
    render(
      createElement(SelectScreen, {
        onBack: () => {},
        onChoose: () => {},
        store: { getSnapshot } as never,
      }),
    );
    await waitFor(() => {
      expect(getSnapshot).toHaveBeenCalledTimes(1);
    });
  });
```

`store: { getSnapshot } as never` — a one-method literal cast, no `vi.mock` of the storage barrel.
**This is why the new screens must take `store?: ProgressStore`.**

**Subtree scoping, for the "`Back` is outside the `ScrollView`" machine half.** The nearest
in-repo instrument is `within()` over a `testID`-tagged wrapper —
`tests/ui/PlayingHost.endless-record.test.tsx:285-288`:

```tsx
          react.createElement(
            View,
            { key: 'result-slot', testID: 'result-slot' },
```

queried at `:647` as `const slot = within(screen.getByTestId('result-slot'));`, with the rule
stated at `:215-221`: *"`result-slot` wraps ONLY the overlay, so 'the campaign best appears nowhere
in the overlay' can be asserted against the overlay's own subtree … It has to be OUTSIDE
`result-slot`."*

**Caveat the planner must resolve, not inherit.** `grep -rn testID src app` returns **zero** — no
production file in this repo carries a `testID`; every occurrence is inside a test mock. So the
UI-SPEC backstop-4 machine half ("assert at the render tree that `Back` and the heading are
outside the `ScrollView` subtree") has **no in-repo precedent for its instrument**. The plan must
pick one and say which: (a) add the first production `testID` in the repo, or (b) fall back to the
source-contract shape below, which can assert sibling order in the JSX text.

---

### `tests/ui/textScale.gate.test.ts` / `tests/ui/shellColorFences.test.ts` (new — source contract)

**Analog A — the file-scan test shape:** `tests/ui/PlayingHost.endless-host.test.ts:1-30`:

```ts
/**
 * ... These are SOURCE contracts, and deliberately so. ...
 *
 * `codeOnly` strips `//` comments first, so a doc note naming `handleRunEnded`
 * can neither satisfy nor falsify a contract.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HOST = join(process.cwd(), 'app/_components/PlayingHost.tsx');

/** Strip // line comments so doc notes cannot false-positive. */
function codeOnly(src: string): string {
  return src.replace(/\/\/.*$/gm, '');
}
```

Note `join(process.cwd(), …)`; `tests/ui/GameHost.test.tsx:118-121` uses
`resolve(__dirname, '../../app/_components/GameHost.tsx')` instead. Both are shipped; pick one.

**Analog B — the BLOCK-comment strip, which A does not do.** `PlayingHost.endless-host.test.ts`
strips `//` only. The two-pattern strip is `tests/ui/achievementLines.test.ts:176-182`:

```ts
    const src = readFileSync(
      'src/runtime/overlays/achievementLines.ts',
      'utf8',
    );
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
```

**Use B, not A.** `src/services/storage/types.ts:69` carries `<Text>evil</Text>` inside a
**block** JSDoc comment; a `//`-only strip leaves it. (It is a `.ts` file, so the `.tsx` scope rule
also excludes it — but the UI-SPEC requires **both** rules, and correctly.)

**The "strip did not delete everything" counter-assertion** — `achievementLines.test.ts:189-192`,
which is what stops the strip from making the gate vacuous:

```ts
    expect(
      /ACHIEVEMENT_LINES_MAX/.test(code),
      'and the constant is named in code rather than only in the prose that explains it — this assertion is what proves the strip above did not delete the only match and leave the one before it passing on a comment',
    ).toBe(true);
```

**Analog C — the red-proof / self-check, both directions, before the real scan.**
`scripts/assert-no-disabled-tests.mjs:64-106`:

```js
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

...
function runSelfCheck() {
  const inCode = "it.todo('x');\ndescribe.only('y', () => {});\nit.skip('z', () => {});";
  const inProse = [
    '/**',
    ' * Plan 00 scaffolded this file as an `it.todo` checklist, and it.only is banned.',
    ' */',
    '// it.skip(...) was once used here.',
    "it('a real case', () => {});",
  ].join('\n');

  for (const [kind, want] of [['todo', 1], ['only', 1], ['skip', 1]]) {
    const got = countIn(stripComments(inCode), kind);
    if (got !== want) {
      fail(
        `self-check FAILED: real \`.${kind}(\` in code counted ${got}, expected ${want}. The guard is blind and a disabled test would ship unnoticed.`,
      );
    }
  }
  for (const kind of ['todo', 'only', 'skip']) {
    const got = countIn(stripComments(inProse), kind);
    if (got !== 0) {
      fail(
        `self-check FAILED: prose mentioning \`.${kind}(\` counted ${got}, expected 0. The guard would fail on files that describe their own history — the defect phase 13 shipped twice.`,
      );
    }
  }
}

runSelfCheck();
```

`scripts/assert-levelgen-thread.mjs:82-93` is the sibling, with the same two-direction shape and
the same two failure messages. **Both run the self-check before the real scan and exit 1 on a
self-check that cannot distinguish the two directions.** That is the red-proof the UI-SPEC demands
for all three `MAX_FONT_SCALE` assertions.

**Vacuity guard** — `assert-no-disabled-tests.mjs:108-113`:

```js
const files = globSync(SCOPE, { cwd: ROOT });
if (files.length < 50) {
  fail(
    `a scan over ${files.length} files passes vacuously — check the glob: ${SCOPE}`,
```

The `textScale` gate should carry the equivalent: assert the enumerated list has **12** members
before scanning, or a typo'd path silently passes.

---

### `docs/ops/PROGRESS-STORAGE.md` and `docs/ops/ACHIEVEMENTS.md`

**Bounds table — add a fifth row.** `docs/ops/PROGRESS-STORAGE.md:111-116`, exactly as shipped:

```
| Collection | Bound | Direction | Why that direction |
|---|---|---|---|
| `recentRuns` | `RECENT_RUNS_BOUND` = 50 | keep **latest** | a recency ring; the oldest run is the one worth losing |
| `byMode.*` maps | `AGGREGATE_MAP_BOUND` = 64 | keep first | every key comes from a five- or one-member domain, so 64 can only drop invented ones |
| `achievements.unlocked` | `ACHIEVEMENT_UNLOCK_BOUND` = 64 | keep **first** | under D-17 an unlock is permanent, so the oldest are the ones held longest |
| `recentRuns[].levelId` | `RUN_LOG_LEVEL_ID_MAX` = 32 chars | entry dropped | four times the longest legitimate value (`level-01`, 8) |
```

followed at `:118-119` by *"The two `keep` directions genuinely differ and both are correct for
their collection. A later change must not unify them."* The `unseen` row is keep-**first**, same
column shape, one line.

**`ACHIEVEMENTS.md` Limit 2b** — `docs/ops/ACHIEVEMENTS.md:576-600`. It is #35 in prose and becomes
**false** the moment D-11 ships. The paragraph that must change:

```
**It is deferred TO Phase 14, and Phase 14 does not currently cover it.** Stated plainly because
the first version of this paragraph implied otherwise: Phase 14's SC-3 as written requires only
locked/unlocked entries with descriptions, so a Phase 14 that satisfies its own success criteria
verbatim still leaves an abandon-earned unlock indistinguishable from every other unlocked entry.
```

The 7-of-12 measurement at `:580-583` stays true and becomes the *provenance* of the mark rather
than of a gap.

---

## Shared Patterns

### Shell contract — safe-area insets + `#1a1a2e` root

**Source:** `app/_components/SelectScreen.tsx:66-78` + `:190-198`; identical at
`TitleScreen.tsx:17-28` + `:45-54` and `LevelErrorOverlay.tsx:17-28`.
**Apply to:** `StatisticsScreen.tsx`, `AchievementsScreen.tsx` (new); `TitleScreen.tsx` (unchanged).

All four insets as inline padding over the root `StyleSheet` entry, then a `content` child carrying
`paddingHorizontal: 24`. `useSafeAreaInsets` imported from `react-native-safe-area-context` in
every case. This is the whole of N-UI-02's assertable half.

### Read-once-on-mount

**Source:** `app/_components/GameHost.tsx:72-86` (with phase gate) and
`app/_components/SelectScreen.tsx:47-64` (without).
**Apply to:** `GameHost.tsx` (extend the existing effect — one effect, three values),
`StatisticsScreen.tsx`, `AchievementsScreen.tsx`.

`useState` with the default; `useEffect`; `let cancelled = false`; `void store.<read>()`;
`.then(cb)` containing **every** `setState`; `.catch(cb)` → defaults; `return () => { cancelled =
true; }`. **No `setState` in an effect body anywhere** — `react-hooks/set-state-in-effect` is
severity `error` and follows a `useCallback` interprocedurally.

### Optional store method, fire-and-forget

**Source:** `src/services/storage/types.ts:647` (`flush?(): Promise<void>;`) and
`app/_components/PlayingHost.tsx:687` (`void store.flush?.().catch(() => {});`).
**Apply to:** `ProgressStore.markAchievementsSeen?()` and its `AchievementsScreen` call site.

### Fail-soft-to-default error handling

**Source:** `SelectScreen.tsx:58-60` (`.catch` → `defaultProgressBlob()`);
`parseBlob.ts:645-653` (`out = default…`, return it unchanged on any structural failure);
`PlayingHost.tsx:1996-2006` (return without writing, `__DEV__`-only `console.error`).
**Apply to:** both new screens, the new sanitizer path, the seen-write.

Zero error UI exists in this repo. Every failure degrades downward and silently.

### Bounded, validated read path

**Source:** `parseBlob.ts:644-679` (drop → dedupe → `slice(0, BOUND)`) and `:681-711`
(drop → `kept >= BOUND` break). **The bound is last in both.**
**Apply to:** `sanitizeAchievementRecord`'s new `unseen` arm.

Reuse `ACHIEVEMENT_UNLOCK_BOUND` (`types.ts:315`); do not mint a second constant. Validate ids with
`isKnownAchievementId` (`src/services/achievements/catalog.ts:723`, imported by
`parseBlob.ts:16`, called at `:595`) and intersect with the parsed `unlocked` set — Pitfall 7's
requirement, and the only thing that makes the UI-SPEC's "capped at 12" claim true.

### Source-contract gate with comment stripping and a two-direction self-check

**Source:** `tests/ui/achievementLines.test.ts:176-192` (block + line strip, plus the
non-vacuity counter-assertion); `scripts/assert-no-disabled-tests.mjs:64-113` (self-check both
directions, then the vacuity guard); `tests/ui/PlayingHost.endless-host.test.ts:1-30`
(`@vitest-environment node` + `readFileSync` + anchored regex slice).
**Apply to:** `tests/ui/textScale.gate.test.ts`, `tests/ui/shellColorFences.test.ts`, and the
extension to `tests/ui/GameHost.test.tsx`'s CERT/SOAK case.

Count with `match(/<Text/g)?.length`, **not** `grep -c` — `grep -c` counts lines, and two `<Text`
on one line under-counts silently.

### jsdom UI test preamble

**Source:** `tests/ui/SelectScreen.test.tsx:1-37`.
**Apply to:** both new `.test.tsx` files.

`/** @vitest-environment jsdom */` docblock; `createElement` not JSX; the per-file
`vi.mock('react-native-safe-area-context', …)` stub; `afterEach(cleanup)`; a local `snapshot()`
factory over `defaultTelemetryBlob()`; DI via a one-method `store: { … } as never` literal.

### Storage barrel imports only

**Source:** `SelectScreen.tsx:5-12`, `GameHost.tsx:8`, `src/services/achievements/index.ts:3-11`.
**Apply to:** both new screens.

Import from `'../../src/services/storage'` and `'../../src/services/achievements'`, never from a
module file inside them. `PLAYABLE_LEVEL_ORDER` (`index.ts:55`), `ENDLESS_TELEMETRY_KEY` (`:31`),
`DAILY_TELEMETRY_KEY` (`:35`), `currentDailyStreak` (`:83`), `defaultProgressBlob` (`:10`),
`createDefaultProgressStore` (`:95`) are all re-exported.

### `numberOfLines={1}` as the truncation instrument

**Source:** **not present in `app/`.** `grep -rn numberOfLines app src` → zero hits in `app/`
(`PlayingHost.tsx:1000` is a comment). There is no shell-*screen* analog.

**But there are two production uses to copy, and they carry the reasoning, not just the prop**
(orchestrator-verified 2026-09-29): `src/runtime/overlays/ResultOverlay.tsx:256` and
`src/runtime/overlays/DailyResultOverlay.tsx:421`. Read `ResultOverlay.tsx:228-248` before writing
the phase-14 rows — it states the three things this phase needs and would otherwise re-derive:

- **What the clamp is for.** *"It is the backstop, not the gate — the gate is the catalog-length
  assertion over `ACHIEVEMENT_NAME_MAX`. What it buys is a strictly better failure: a catalog
  authoring mistake becomes 'a name is visibly truncated' rather than '`Menu` is clipped off the
  bottom of a panel that cannot scroll'."* That is exactly the role UI-SPEC backstop 6 assigns it,
  and it is why a truncation and a wrap are different outcomes there.
- **A grep-gate hazard this phase inherits.** That comment deliberately avoids writing the
  attribute form, because the gate pinning the prop to one occurrence *is* a grep and a grep
  cannot tell a comment from an AST node. Any phase-14 occurrence-count gate over
  `numberOfLines` must therefore comment-strip first — the same rule
  [assertion 3 of the UI-SPEC](#the-multiplier) was just corrected for.
- **The measurement is scoped, not stale.** The same comment's *"measured: zero `numberOfLines`
  props across all five overlay files"* is qualified **"before this one"** and is true as written.
  It is not the drift family; do not "correct" it.

---

## No Analog Found

Files or patterns with no close match. The planner should use `14-RESEARCH.md` § Code Examples and
`14-UI-SPEC.md` for these, and should treat them as the phase's genuinely new code.

| Pattern | Role | Data Flow | Reason |
|---|---|---|---|
| A **control** (`Pressable`) fixed outside a scrolling subtree | screen component | scroll | The only `ScrollView` in `src/`+`app/` is `LevelErrorOverlay.tsx:32`, which renders **zero** `Pressable` nodes by design (`:12`: *"No Retry/play controls"*). The fixed-header *structure* transfers; a reachable fixed *control* beside a scroll has never shipped here. UI-SPEC backstop 4 is human-only for exactly this reason. |
| A `flex: 1` full-screen `ScrollView` | screen component | scroll | `LevelErrorOverlay`'s scroll is `maxHeight: 240` (`:80-82`) inside a `maxHeight: '80%'` panel (`:54-61`). No screen-level scroll viewport exists. Do not copy `maxHeight: 240`. |
| **Freeze-at-read state** — a value snapshotted at the moment of the read that must keep rendering after its source is cleared | screen component | read-once + write | No shipped component holds two pieces of state from one read where one is deliberately *not* derived from the other. The closest in spirit is the `useRef` mirror-of-state idiom (`PlayingHost.tsx:290-296`), but that exists to defeat memoised-callback staleness, which is a different problem. `14-RESEARCH.md` § Code Examples has the intended `unseenAtMount` shape; it is research, not shipped code. |
| A **production `testID`** for render-tree subtree assertions | test instrument | — | `grep -rn testID src app` → **zero**. Every `testID` in the repo is inside a `vi.mock` factory (`tests/ui/PlayingHost.endless-record.test.tsx:287`). Adding one to `AchievementsScreen` would be the first in the tree; the plan must decide that explicitly rather than assume precedent. |
| `numberOfLines` on a shell screen | screen component | — | Zero occurrences in `app/`, but **two in `src/runtime/overlays/` to copy** (`ResultOverlay.tsx:256`, `DailyResultOverlay.tsx:421`) — see the section above. No shell-*screen* analog; the prop and its rationale both exist. |
| `useSyncExternalStore` / a store subscription | — | — | Not present. Zero `subscribe` in `src/services/storage/**`; `getSnapshot()` is `async`. Correctly rejected by `14-RESEARCH.md` § Alternatives. |

---

## Corrections to upstream artifact citations

Recorded because this repo's standing hazard is a doc naming a line, gate or constant that is not
there. The planner should use the numbers in this column.

| Artifact claim | What is actually there |
|---|---|
| `14-RESEARCH.md`: the `SelectScreen` read is at `:52-66` / `:48-66` / `:43-66` (three different ranges for one pattern) | `useMemo` store resolve **`:43-46`**, `useState` **`:47-49`**, `useEffect` **`:51-64`** |
| `14-RESEARCH.md`: *"the `slice(0, ACHIEVEMENT_UNLOCK_BOUND)` at line 670"*; `sanitizeAchievementRecord` at `:644-672` | declaration **`:644`**, `slice` **`:677`**, function ends **`:679`**. The JSDoc's numbered three-step list is **`:605-611`** |
| `14-RESEARCH.md`: the daily read-only branch at `PlayingHost.tsx:1945-1993` | `startDailyRun` **`:1928`**, the `hasResultFor` guard **`:1959`**, branch ends **`:1993`** |
| `parseBlob.ts:670-673` comment: *"`sanitizeAggregateMap` below has NO key cap and copies every key it finds on every parse"* | **False since `AGGREGATE_MAP_BOUND` landed** — the cap is at `:705-707`, and the present tense is the whole defect. Phase 14 must touch this exact function for `unseen` site 4, so the plan should repair the sentence in passing. **`types.ts:319-321` is NOT the same drift** — it is past-tense history of why the constant was added, and is correct |
| `14-UI-SPEC.md` § The multiplier table: `PlayingHost` `<Text>` = 7, *"two deleted"*, and a correction saying three | **Three.** `grep -n '<Text'` → `:2648 :2659 :2668 :2682 :2707 :2715 :2733`. Deleting `:2682`, `:2707`, `:2715` leaves **4**. The correction is right; the table row is not |

---

## Metadata

**Analog search scope:** `app/_components/**`, `src/runtime/**`, `src/runtime/overlays/**`,
`src/services/storage/**`, `src/services/achievements/**`, `tests/ui/**`, `tests/*.test.ts`,
`scripts/assert-*.mjs`, `docs/ops/**`, `eslint.config.js`
**Files read in full:** 6 (`SelectScreen.tsx`, `TitleScreen.tsx`, `GameHost.tsx`,
`LevelErrorOverlay.tsx`, `constants.ts`, `substepCap.ts`)
**Files read by targeted range:** 16
**Files scanned by grep only:** ~40
**Tracked-source gate:** all 22 cited analog paths verified via `git ls-files`; `.gsd/` is
gitignored (`.gitignore:51`) and contributes no path to this map
**Pattern extraction date:** 2026-09-29
