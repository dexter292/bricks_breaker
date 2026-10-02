# Phase 13: Achievements - Pattern Map

**Mapped:** 2026-09-28
**Files analyzed:** 21 (10 new, 11 modified)
**Analogs found:** 19 / 21 with a file-level analog · 2 with none

**Every line number in this file was re-derived at HEAD `0b0e7e0` (`docs(13): add validation
strategy`), branch `gsd/phase-10-board-generator`, working tree clean apart from
`.planning/`.** None is inherited from `13-CONTEXT.md`, `13-UI-SPEC.md`, `13-VALIDATION.md` or
`12-PATTERNS.md`; where a document's number had drifted it is corrected here in § Drift
corrections rather than silently restated. Prose names symbols; line numbers appear only where
they were measured this session.

Every analog path below was gated with `git ls-files -- <path>` this session (26 paths, 0
untracked). All are tracked source. This repo has no `.gsd/capabilities/` mirror tree, so no
substitution was needed.

---

## The file list, checked against the artifacts

The orchestrator's list was verified against `13-CONTEXT.md`, `13-UI-SPEC.md` and
`13-VALIDATION.md`. It is correct as far as it goes, with **two omissions** and **one item whose
split is a planner choice, not a contract**.

### Two files the artifacts require that the list omits

| Missing file | Where the artifact requires it | Why it is not optional |
|---|---|---|
| `src/runtime/GameScreen.tsx` | `13-UI-SPEC.md` § Surfaces Touched, row "Host wiring": *"Threads the string array to whichever panel is mounted."* | **`PlayingHost` does not render either panel.** `GameScreen.tsx:270-301` is the only site that mounts `DailyResultOverlay` or `ResultOverlay`, and `PlayingHost.tsx:2637-2678` reaches them only through `<GameScreen>`. A prop added to both panels and to `PlayingHost` with no `GameScreen` edit cannot reach either panel. |
| `src/services/storage/index.ts` | Implied by `13-VALIDATION.md` § Wave 0 (`tests/achievements.record.test.ts`) and by D-13 | The barrel is the only import surface tests and the host use: `tests/storage.daily-firewall.test.ts:40-47` imports `DAILY_TELEMETRY_KEY`, `createMemoryProgressStore` and `defaultRunStatsInput` from `'../src/services/storage'`. The unlock record type, its default and the merge are unreachable from a test until they are re-exported (`index.ts:1-38` types, `:70-77` telemetry helpers). Phase 12 treated this file as modified for the same reason. |

### One list item that is a choice, not a contract

`src/services/achievements/catalog.ts` + `evaluate.ts` + `index.ts` as **three** files is the
`src/services/daily/` shape (`dateKey.ts` + `streak.ts` + `index.ts`) and is well supported — but
`13-CONTEXT.md` § Claude's Discretion only says *"Where the catalog and evaluator modules live"*,
and `13-UI-SPEC.md` § Surfaces Touched names the **directory** `src/services/achievements/`, never
a filename. The split is recommended (see § `src/services/achievements/` below) but a planner
collapsing it to two files breaks no contract.

### Nothing in the list is spurious

Every other entry is named or structurally forced by an artifact. The one that is *inferred*
rather than named is `src/services/storage/telemetry.ts`, and the inference is hard: `TelemetryBlob`
is cloned and merged **field by field** at `telemetry.ts:59-77` (`cloneTelemetryBlob`) and
`:744-768` (`mergeTelemetryBlobs`). A field added to the type without an edit to both is silently
dropped on every write — see § The three-site trap.

---

## File Classification

| New/Modified File | New? | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|---|
| `src/services/achievements/catalog.ts` | new | model (data-as-config) | transform | `src/services/endless/ramp.ts` (header + purity) · `src/services/daily/dateKey.ts:274-294` (`DAILY_DIFFICULTY`, the judged constant) | role-match |
| `src/services/achievements/evaluate.ts` | new | utility (pure policy) | transform | `src/services/daily/streak.ts` | role-match — **one sub-problem has no precedent** |
| `src/services/achievements/index.ts` | new | barrel | — | `src/services/daily/index.ts` (whole file, 11 lines) | exact |
| `src/services/storage/types.ts` | mod | model (schema) | CRUD (schema) | itself — `DailyRecord` (`:209-264`), `DailyHistoryEntry` (`:197-207`), `defaultDailyRecord` (`:306-309`), `DAILY_HISTORY_BOUND` (`:55-71`) | exact |
| `src/services/storage/parseBlob.ts` | mod | service (sanitize-on-read) | transform | `sanitizeDailyRecord` (`:485-533`) + `sanitizeDailyHistoryEntry` (`:398-432`), wired at `:589` | exact — **one field diverges, see below** |
| `src/services/storage/telemetry.ts` | mod | service (merge) | transform | `mergeDailyRecord` (`:103-182`) + `mergeDailyRecords` (`:580-682`) + `cloneTelemetryBlob` (`:59-77`) | exact |
| `src/services/storage/memoryStore.ts` | mod | store | CRUD | its own daily arm (`:162-178`) inside `recordRunEnd` (`:100-180`) | exact |
| `src/services/storage/asyncStorageStore.ts` | mod | store | CRUD | its own daily arm (`:448-467`) inside `recordRunEnd` (`:369-…`) — hand-mirrored | exact |
| `src/services/storage/index.ts` | mod | barrel | — | itself (`:1-38`, `:70-77`) | exact |
| `src/runtime/overlays/achievementLines.ts` | new | utility (pure classifier) | transform | `countdownForm` / `CountdownForm` (`DailyResultOverlay.tsx:59-124`) for the shape · `app/_components/certLevelPlan.ts` for the *extraction* | role-match — **no standalone classifier module exists in `src/runtime/`** |
| `src/runtime/overlays/ResultOverlay.tsx` | mod | component (leaf) | request-response | itself — conditional-line block `:189-204`, `showRunLines` `:150` | exact |
| `src/runtime/overlays/DailyResultOverlay.tsx` | mod | component (leaf) | request-response | itself — conditional-line block `:304-356`, `isClosed` `:253` | exact |
| `src/runtime/GameScreen.tsx` | mod | component (router) | request-response | itself — the daily prop block `:43-95` and the route `:270-301` | exact |
| `app/_components/PlayingHost.tsx` | mod | host (controller) | request-response + event-driven | its own daily machinery: `publishDailyPanel` (`:951-974`), `handleRunEnded` daily arm (`:1003-1058`), prop threading (`:2637-2678`) | exact — **one sub-problem has no precedent** |
| `tests/achievements.catalog.test.ts` | new | test (pure) | transform | `tests/ui/certLevelPlan.test.ts` (derive-the-domain table) + `tests/core.purity.test.ts:1-45` (source scan) | exact |
| `tests/achievements.evaluate.test.ts` | new | test (pure) | transform | `tests/endless.ramp.test.ts` | exact |
| `tests/achievements.record.test.ts` | new | test (store) | CRUD | `tests/storage.daily-firewall.test.ts` (both-stores harness) + `tests/daily.record.test.ts` (read/write cases) | exact — **a merge of two analogs** |
| `tests/ui/achievementLines.test.ts` | new | test (pure classifier) | transform | `tests/ui/DailyResultOverlay.test.tsx:93-171` · `tests/ui/certLevelPlan.test.ts:1-21` for the environment | exact |
| `tests/ui/ResultOverlay.achievements.test.tsx` | new | test (component) | request-response | `tests/ui/DailyResultOverlay.test.tsx` | exact |
| `tests/storage.progress-v4.test.ts` | mod | test (parser) | transform | itself — `describe('sanitizeDailyRecord …')` at `:422-724` | exact |
| `tests/ui/DailyResultOverlay.test.tsx` | mod | test (component) | request-response | itself — `:173-394` | exact |

---

## Pattern Assignments

### `src/services/achievements/` — daily or endless? Both, for different things.

**The structural fact that decides it, measured today by a repo-wide grep for consumers of each
barrel:**

| Module | Imported by |
|---|---|
| `src/services/endless` | `app/_components/PlayingHost.tsx:33` — **the host tier only** |
| `src/services/daily` | `src/services/storage/telemetry.ts:16`, `src/services/storage/parseBlob.ts:10`, **and** `app/_components/PlayingHost.tsx:42` |

**D-01 puts evaluation inside `recordRunEnd`, which is the storage layer. That is the daily
relationship, not the endless one.** `endless/ramp.ts` is consumed only above storage, so it
never had to answer "what does the storage layer need from me"; `daily/` did, and the shape of its
answer is the thing to copy. Concretely:

- **Module topology → `src/services/daily/`.** Two policy modules behind one barrel with named
  exports (`daily/index.ts:1-11`, 6 + 3 exports). `endless/` is one module and two exports
  (`endless/index.ts:1-3`) — too small a shape for a catalog *and* an evaluator *and* the
  id-validating predicate the parser will want.
- **The read-path predicate → `daily/dateKey.ts`'s `isValidDateKey` (`:235-246`, JSDoc
  `:217-234`).** It is total over `unknown`, is a type predicate, does integer range checks with
  no parse round trip, and lives **beside the derivation it guards** — then `parseBlob.ts:10`
  imports it across the module boundary. That import edge is the exact precedent for
  `parseBlob.ts` importing an `isKnownAchievementId` from `src/services/achievements` to discharge
  D-15's "an unknown id is dropped". Do not restate the catalog's ids in the parser.
- **Module header → `src/services/endless/ramp.ts:1-48`.** This is the canonical four-section
  header (*What is contract and what is borrowed* · *Why the clamp lives in this body* · *Why …* ·
  *No implementation-approximated Math* + a closing `SECURITY:` line), and both daily modules copy
  it (`daily/streak.ts:1-54` names `ramp.ts` § No implementation-approximated Math by name at
  `:39`). The achievements header owes the same four sections: what is contract (the id set, the
  declaration order, D-02's set difference), what is borrowed (the 16 `TelemetryAggregate` fields
  belong to `storage/types.ts` and are not restated), why the totality lives in this body (a
  tampered blob is the hostile caller), and the ban — which here is **no clock, no storage read, no
  randomness (D-03)**, and which `13-VALIDATION.md` already owes a test case for.

**The honest divergence, and it is the one real gap in this file's analog:** neither
`src/services/daily/**` nor `src/services/endless/**` imports `src/services/storage` — verified by
grepping every `from '…'` in both trees (5 import statements total, all local or to `src/levelgen`).
`daily/streak.ts` takes `readonly string[]`, never a `DailyRecord`; the one function that does take
a `DailyRecord` — `currentDailyStreak` — lives in **`telemetry.ts:455-457`, inside storage**. The
achievements evaluator needs a telemetry-shaped snapshot (D-03), so it is the first
`src/services/<mode>/` module with that need. See § No Analog Found, item 2.

---

### `src/services/achievements/catalog.ts` (model, data-as-config)

**Analog for the judged threshold (D-11):** `DAILY_DIFFICULTY` at
`src/services/daily/dateKey.ts:274-294`. Twenty lines of JSDoc for one number, and it is the
model D-11 explicitly asks for — it cites the generator's published table
(`docs/ops/BOARD-GENERATOR.md:171-193`), gives the two anchors the number sits between, gives a
measured median clear time, and closes with what the number makes safe downstream. Declared
`export const DAILY_DIFFICULTY = 10 as const;`.

```ts
/**
 * The difficulty every daily board is generated at (D-11) — fixed, mid-scale, and the
 * same number on every date so no player loses a streak because their date drew a hard
 * board.
 *
 * Why 10, on the generator's own published table (`docs/ops/BOARD-GENERATOR.md:171-193`):
 * ...
 */
export const DAILY_DIFFICULTY = 10 as const;
```

**Analog for a bound that states its arithmetic:** `DAILY_HISTORY_BOUND`
(`storage/types.ts:55-71`) — the house rule is that a constant states the arithmetic behind it
rather than asserting a number (*"~45 bytes of JSON, so 400 entries is ~18KB against the ~2MB
Android CursorWindow practical ceiling"*). The unlock-set bound owes the same sentence, and it has
a second argument available that the daily window did not: the set is bounded by the catalog
itself (D-09's 8–12), so the stored bound is a tamper fence, not a capacity estimate — which is
the `DAILY_STREAK_WALK_CAP` framing (`types.ts:73-92`, *"a TAMPER FENCE, not a streak ceiling"*),
not the `DAILY_HISTORY_BOUND` one.

**Analog for the closed-set constant the parser reads:** `DAILY_OUTCOME_SET`
(`parseBlob.ts:391-396`) and `GAME_MODE_SET` (`:322`) — a `new Set<string>([...])` declared
immediately above the sanitizer that uses it, with a comment saying why the set is *narrower* than
the neighbouring type.

**The 16-character name budget (`13-UI-SPEC.md` § The 16-character name budget) has no direct
analog** but a close idiom: `tests/ui/certLevelPlan.test.ts:13-18` — *"WHY THE DOMAIN IS DERIVED
AND NOT LISTED … A hand-written list would go on passing while a sixth playable level escaped the
table entirely."* The catalog-length assertion must quantify over the **exported catalog**, never
over a literal list of names.

---

### `src/services/achievements/evaluate.ts` (utility, pure policy)

**Analog:** `src/services/daily/streak.ts`. Copy four properties, all visible in that file:

1. **Total over hostile input, folding rather than throwing** (`streak.ts:24-30`): *"These
   functions are TOTAL over any array of strings and fold degenerate input — unsorted, duplicated,
   malformed — into a non-negative integer or a null rather than throwing. The fence against a
   tampered blob is `isValidDateKey` on the read path … a policy that threw on bad input would
   turn a corrupt history into a crashed panel."* `13-UI-SPEC.md` § Error state says the same
   thing about a thrown evaluator: *"The host passes no names; the block is absent."*
2. **Degenerate input fails in the under-reporting direction, asserted rather than assumed**
   (`streak.ts:32-35`): *"An unsorted array yields a SHORTER streak, never a longer one … so the
   degenerate case fails safe and is asserted that way rather than assumed."*
3. **Bodies are small and the JSDoc carries the argument.** `streakFrom` is 13 lines
   (`:84-96`) under 12 lines of JSDoc; `endedStreakLength` is 27 lines (`:128-153`) under 30 lines
   of JSDoc that enumerates its five cases and then marks each `return` with the case number:

```ts
export function streakFrom(sortedKeys: readonly string[]): number {
  if (sortedKeys.length === 0) {
    return 0;
  }
  let n = 1;
  for (let i = sortedKeys.length - 1; i > 0; i--) {
    if (sortedKeys[i - 1] !== previousDateKey(sortedKeys[i]!)) {
      break;
    }
    n++;
  }
  return n;
}
```

4. **A deliberate-omission paragraph the next reader will otherwise "fix"** (`streak.ts:115-122`,
   on why `longestStreak` is never substituted): *"This paragraph exists because the omission looks
   like a missing feature to a later reader and will otherwise get 'fixed'."* The achievements
   counterpart is D-01's rejected alternative — re-evaluating on hydrate — which will look like a
   missing feature to exactly the same reader.

**The sub-problem with no analog:** the evaluator's snapshot argument. See § No Analog Found.

---

### `src/services/achievements/index.ts` (barrel)

**Analog:** `src/services/daily/index.ts` — the whole file:

```ts
/** Daily date policy barrel (N-DAILY-01 / N-DAILY-03 / LC-16) — the only surface for this policy. */

export {
  localDateKey,
  localMidnightEndingMs,
  nextLocalMidnightMs,
  previousDateKey,
  isValidDateKey,
  DAILY_DIFFICULTY,
} from './dateKey';
export { hasResultFor, streakFrom, endedStreakLength } from './streak';
```

Named exports only, no `export *`, one grouped `export { … } from './x'` per source module, and a
single-line header naming the requirement ids and the LC-16 "only surface" claim.
`src/services/endless/index.ts:1-3` is the same file with one module.

---

### `src/services/storage/types.ts` (model, schema)

**Analog:** its own daily members. Four separate patterns.

**(a) The entry type, with the field whose narrowing is contract** (`types.ts:197-207`):

```ts
/** One closed date (D-01) — the date, what it scored, and how it ended. */
export type DailyHistoryEntry = {
  /** Local calendar date as `YYYY-MM-DD` (`src/services/daily` `localDateKey`). */
  date: string;
  score: number;
  /**
   * Deliberately NOT `RunOutcome`: an `abandoned` run accumulates telemetry (D-09) but
   * does not CLOSE the date (D-07), so it never reaches this history at all.
   */
  outcome: 'win' | 'lose';
};
```

The unlock entry is this shape with `{ id, at }`. The `id` field owes the same "which module mints
this string" pointer the `date` field carries, aimed at `src/services/achievements`.

**(b) The record inside `TelemetryBlob`, with the independence paragraph** (`types.ts:209-221`,
the JSDoc above `DailyRecord`):

```ts
/**
 * Daily per-date history (N-DAILY-02 / D-01 / D-15).
 *
 * Lives INSIDE `TelemetryBlob` for the same reason `EndlessRecord` does: telemetry is
 * the one sub-object whose parser is validated independently of its siblings
 * (`parseBlob.ts` `sanitizeTelemetry`), so a corrupt daily history degrades itself alone
 * and can never take campaign unlocks or bests with it (SC-5).
 *
 * D-16's two unbounded scalars … are additive to this same record … They need
 * no version bump, exactly as the endless record needed none when it was added to an
 * existing v4 blob.
 */
```

That last sentence **is** D-13, already written down, with `endless` cited as the precedent for
`daily`. The achievements record's own paragraph cites `daily` in turn.

**(c) The sibling declaration inside `TelemetryBlob`** (`types.ts:266-278`) — note that each
record carries a one-line "written only by X" comment, which is the only thing distinguishing
`telemetry.daily` from `telemetry.byMode.daily` at a glance:

```ts
export type TelemetryBlob = {
  lifetime: TelemetryAggregate;
  byMode: { campaign: …; endless: …; daily: … };
  /** Endless running maxima (N-END-02) — written only by `mergeEndlessRecord`. */
  endless: EndlessRecord;
  /** Daily per-date history (D-15) — written only by `mergeDailyRecord`. */
  daily: DailyRecord;
  recentRuns: RunLogEntry[];
};
```

**(d) The default, and the two places it must be wired** (`types.ts:301-319`):

```ts
/** All-zero endless record — no endless run has been recorded yet. */
export function defaultEndlessRecord(): EndlessRecord { … }

/** Empty daily record — no date has been closed yet. */
export function defaultDailyRecord(): DailyRecord {
  return { history: [], longestStreak: 0, totalDaysPlayed: 0, currentStreakStart: '' };
}

export function defaultTelemetryBlob(): TelemetryBlob {
  return {
    lifetime: defaultTelemetryAggregate(),
    byMode: { campaign: {}, endless: {}, daily: {} },
    endless: defaultEndlessRecord(),
    daily: defaultDailyRecord(),
    recentRuns: [],
  };
}
```

The default constructor being reachable from `defaultTelemetryBlob()` is what makes D-13's
no-migration claim true: `sanitizeTelemetry` starts from `defaultTelemetryBlob()`
(`parseBlob.ts:576`), so an older v4 blob defaults the field cleanly. That is stated at
`parseBlob.ts:564-565` and proved at `tests/storage.progress-v4.test.ts:689-723`.

**No `RecordRunEndArgs` change is needed.** D-01 evaluates against the post-merge snapshot inside
`recordRunEnd`; nothing new rides the argument. The union (`types.ts:392-448`) and its three arms
stay as they are. **But see § No Analog Found item 1 for the `ProgressStore.recordRunEnd` return
type (`types.ts:461`), which may need to change and has no precedent for doing so.**

---

### `src/services/storage/parseBlob.ts` (service, sanitize-on-read) — the D-13 map

**Analog:** `sanitizeDailyRecord` (`:485-533`) — the exact D-13 precedent, wired into
`sanitizeTelemetry` at `:589`, added with no `PROGRESS_VERSION` bump and no migration.

**The record sanitizer, verbatim:**

```ts
function sanitizeDailyRecord(raw: unknown): DailyRecord {
  const out = defaultDailyRecord();
  if (raw == null || typeof raw !== 'object') {
    return out;
  }
  const record = raw as {
    history?: unknown;
    longestStreak?: unknown;
    totalDaysPlayed?: unknown;
    currentStreakStart?: unknown;
  };
  out.longestStreak = safeCounter(record.longestStreak);
  out.totalDaysPlayed = safeCounter(record.totalDaysPlayed);
  if (Array.isArray(record.history)) {
    const entries: DailyHistoryEntry[] = [];
    for (const item of record.history) {
      const entry = sanitizeDailyHistoryEntry(item);
      if (entry != null) {
        entries.push(entry);
      }
    }
    // Bound on read as well as on write — a tampered blob cannot grow the window.
    out.history = entries.slice(-DAILY_HISTORY_BOUND);
  }
  out.currentStreakStart = sanitizeStreakStart(record.currentStreakStart, out.history);
  return out;
}
```

**Its JSDoc (`:485-506`) is the D-13 argument in prose and should be mirrored sentence for
sentence:** *"**Shape** copies `sanitizeEndlessRecord`: start from `defaultDailyRecord()`, copy
only the keys the default declares, and coerce each field on its own — so a broken `longestStreak`
cannot discard a good history, and an existing v4 blob written before this record existed defaults
cleanly with no `v` bump and no migration."*

**The wiring (`:587-595`) — one line, and the sibling order matters only for readability:**

```ts
  out.lifetime = sanitizeAggregate(telemetry.lifetime);
  out.endless = sanitizeEndlessRecord(telemetry.endless);
  out.daily = sanitizeDailyRecord(telemetry.daily);
```

The independence contract the new sanitizer inherits is stated in `sanitizeTelemetry`'s own JSDoc
at `:553-574`, which already has a three-paragraph structure (telemetry alone · endless · daily,
each naming the SC it discharges). Add a fourth paragraph; do not rewrite the first three.

#### Where the shapes diverge — a set of ids with timestamps is not a record of scalars

| Divergence | The daily code does | The achievements code must |
|---|---|---|
| **The scalar loop does not apply** | `sanitizeEndlessRecord` (`:345-355`) iterates `Object.keys(out)` and `safeCounter`s every one. `sanitizeDailyRecord` handles `longestStreak` / `totalDaysPlayed` that way (`:518-519`) and the collection separately. | An unlock set has no fixed scalar keys. Use the **collection** half only: drop-on-invalid per entry, then bound. The right sub-analog is `sanitizeDailyHistoryEntry` (`:398-432`), not `sanitizeEndlessRecord`. |
| **Ordering of drop-then-trim is contract** | `:528-529` — *"Bound on read as well as on write"*, applied AFTER the drop loop. `:495-499` states why: *"Trimming first would let padding garbage push real dates out of the window."* `tests/storage.progress-v4.test.ts:609` is the case. | Same order, same reason. |
| **Do not re-sort, do not de-dup** | `:501-505` — *"Sorting here would REPAIR a tampered blob into a longer streak than its own stored order can justify — an inflation, in the one direction this phase refuses."* | **Weaker here, and say so.** An unlock set is unordered and D-14's timestamps are the recency key; `13-UI-SPEC.md` § Ordering is contract makes *catalog declaration order* the display order, derived in the host, not in storage. De-duplication by id is legitimate here where it is not for dates — but it must keep the **earliest** timestamp, not the last-seen one. |
| **The id field is validated against a closed set, not coerced** | `:421-423` — `isValidDateKey(entry.date)` → `return null`. The predicate is imported from the module that mints the key (`:10`). | Same shape, aimed at the catalog: an unknown id is dropped (D-15). **Never `safeCounter` an id.** |
| **The timestamp field: the shipped drop-on-invalid rule is the WRONG analog** | `sanitizeRunLogEntry:378-380` drops the **whole entry** when `timestamp` is not a finite number. `sanitizeDailyHistoryEntry` has no timestamp at all. | **D-15 says *"a malformed timestamp defaults"*, and D-17 says an unlock is one-way. Dropping the entry on a bad timestamp would un-earn an achievement** — the one thing the phase forbids. So the id and the timestamp take *different* failure rules within one entry: bad id → drop the entry; bad timestamp → `safeCounter`-style default and keep the entry. **There is no in-repo precedent for two different failure rules inside one entry sanitizer**, and it must be written down in the JSDoc or a later reader will "unify" it. |

**The trap in the same file, unchanged since phase 12** (`parseBlob.ts:535-551`,
`sanitizeAggregateMap`): no key cap anywhere, every key in the raw object is copied on every parse.
An unlock collection **keyed by achievement id** is safe from this only because unknown ids are
dropped against the catalog (D-15) — that drop *is* the cap. If the planner ever relaxes the
unknown-id drop "to be forward-compatible with a later catalog", the collection becomes the exact
unbounded map that `DAILY_TELEMETRY_KEY`'s comment (`types.ts:186-195`) exists to prevent. Store an
**array of entries with a bound**, or keep the id validation; do not do neither.

Note also: `parseBlob.ts:325-331` defines `safeCounter(raw: unknown)` while
`telemetry.ts:35-41` defines a different `safeCounter(n: number)`. They are two functions with one
name in two files. Use the one local to the file being edited.

---

### `src/services/storage/telemetry.ts` (service, merge)

**Analog:** `mergeDailyRecord` (`:103-182`) for the per-run fold and `mergeDailyRecords`
(`:580-682`) for the memory↔disk reconcile.

**The per-run fold — clone first, mutate the clone, never touch the input** (`:122-182`, abridged
to the structure):

```ts
export function mergeDailyRecord(
  telemetry: TelemetryBlob,
  run: { date: string; score: number; outcome: 'win' | 'lose' },
): TelemetryBlob {
  const next = cloneTelemetryBlob(telemetry);
  const entry: DailyHistoryEntry = { date: run.date, score: safeCounter(run.score), outcome: run.outcome };
  const at = next.daily.history.findIndex((e) => e.date === entry.date);
  const history = [...next.daily.history];
  if (at >= 0) { history[at] = entry; } else { history.push(entry); }
  …
  next.daily = {
    // Bound on write (D-15), same one-line shape as the recent-run ring below.
    history: history.slice(-DAILY_HISTORY_BOUND),
    …
  };
  return next;
}
```

Its JSDoc (`:103-121`) carries the sentence the achievements merge owes verbatim in substance:
*"Deliberately NOT part of `mergeRunIntoTelemetry` … keeping the per-date record on a separate
entry point is what makes 'a campaign run cannot close a daily date' a structural fact rather than
a convention."* **The achievements inversion is worth stating explicitly, because it is the
opposite:** D-12 covers all three modes, so the unlock merge is the *first* record in the blob that
legitimately rides **every** mode. It therefore belongs structurally where `mergeRunIntoTelemetry`
sits in the stores — **outside every mode gate** — not where `mergeEndlessRecord` and
`mergeDailyRecord` sit. Copying the daily arm's placement is the single most likely mistake here.

**Idempotency has a shipped precedent** (`:112-115`, `:146-151`): *"A date already present is
REPLACED IN PLACE rather than appended twice (D-06: one attempt per date). That also makes the
write idempotent."* D-02's set difference is the stronger version of the same idea and needs no
`findIndex` — an id already in the set produces an empty diff by construction.

#### The three-site trap — a new `TelemetryBlob` field dies silently in two of three places

`TelemetryBlob` is cloned and merged **field by field**, nowhere by spread. Three sites must learn
the field or it is dropped:

| Site | Line | What happens if it is missed |
|---|---|---|
| `cloneTelemetryBlob` | `:59-77` — `daily:` is deep-cloned at `:69-74` | **Worst case.** Every `mergeEndlessRecord` (`:95`) and `mergeDailyRecord` (`:126`) starts with `cloneTelemetryBlob(telemetry)`, so an unlisted field is dropped on **every** other mode's run-end write. A campaign run would erase the unlock set. |
| `mergeTelemetryBlobs` | `:744-768` — `daily: mergeDailyRecords(…)` at `:765` | The unlock set is lost on every memory↔disk reconcile, i.e. on every cold start that hydrates after a write. |
| the per-record merge | new, modelled on `:103-182` | The evaluation never persists. |

`cloneTelemetryBlob` is the one most easily missed because nothing about it mentions the new
feature, and no test names it directly. `tests/storage.progress-v4.test.ts:1065` is the shipped
guard for the endless record (*"cloneTelemetryBlob deep-copies the endless record so a mutation
cannot leak across the memory/disk boundary"*) and is the case to copy.

#### The cross-wiring hazard, named

`13-CONTEXT.md` asked whether the achievements merge has an equivalent of the
`carriedStartIsCredible` hazard. **It has a narrower one, in the same family, and it is real.**

The shipped lesson, at `telemetry.ts:699-726` (`reconcileStreakStart`'s post-mortem) and
`:366-379` + `:404-411` (`carriedStartIsCredible`'s single-record signature), reduces to one
sentence the file itself states: *"**A claim is evidence about the record that MADE it, so that
record — and nothing else — must be able to account for it.**"* The shape fix was to hand the
predicate **one whole record** rather than its parts, backed by a nominal type
(`DerivedStart`, `:193`) that only one producer can mint, and by
`scripts/assert-streak-evidence.mjs` in the `npm test` chain (`package.json:60`).

**Where it recurs for achievements, and where it does not:**

- **It does not recur for the id set.** An id is its own evidence; there is no claim/evidence pair
  to cross. The union of two id sets cannot inflate.
- **It recurs for the timestamp.** The hazard is a merge that unions the **ids** and then reduces
  over **all** the timestamps — `Math.min` across the whole collection rather than per id — which
  would stamp every achievement with the earliest unlock time in either copy. That is
  structurally identical: one record's evidence attached to another's claim. **The shape fix is
  the one `mergeDailyRecords` already uses at `:621-630`** — build a `Map` keyed by the identity
  field and merge whole entries, never two parallel arrays:

```ts
  const byDate = new Map<string, DailyHistoryEntry>();
  for (const e of a.history) { byDate.set(e.date, { ...e }); }
  for (const e of b.history) { byDate.set(e.date, { ...e }); }
```

  A signature of `mergeAchievements(ids: readonly string[], timestamps: readonly number[])` is the
  signature that lets a caller cross them. Do not write it. Union `{ id, at }` records.

- **One shipped rule in that very snippet is WRONG here and must be inverted.**
  `mergeDailyRecords`' JSDoc says at `:584-587`: *"Where both sides carry the same date,
  `incoming` wins — it is the freshly-hydrated disk state, and D-06 makes a date's result
  write-once anyway."* For an unlock, last-writer-wins moves the timestamp **forward**, and D-14
  stores timestamps precisely so Phase 14 can show a recency order. **Earliest must win.** Copying
  the `byDate.set` loop without inverting this is a silent D-14 defect that no current test would
  catch. Record it as an anti-pattern beside the copy.

- **`mergeEndlessRecords` (`:572-578`) is not the model** either — a pure per-field `Math.max` says
  nothing about a keyed collection. The in-repo model for "sums and maxes in one object" is
  `mergeAggregates` (`:528-550`) and the contract behind it is in the module header at `:5-8`; for
  a keyed collection it is `mergeDailyRecords` alone.

---

### `src/services/storage/memoryStore.ts` + `asyncStorageStore.ts` (store, CRUD)

**This is the single most repeated source of work in this codebase, and the two stores'
own comments say so.** `memoryStore.ts:133-135` and `asyncStorageStore.ts:413-415` carry the same
paragraph, measured during phase 12:

> MEASURED: keying this branch per calendar date reds both of them, in THIS store
> only, with the sibling store's copies still green — the two hand-mirrored stores
> are parameterised separately and gated independently.

**The obligation, stated explicitly for this phase:**

1. Every edit lands **twice**, by hand, in both files.
2. Every behavioural claim is asserted **twice**, through the parameterised suite — see the test
   assignment below. `13-VALIDATION.md` already carries the row (*"**both hand-mirrored stores
   agree**"*).
3. The two files are **not copy-paste compatible**, and this is where a careless mirror breaks:

| | `memoryStore.ts` | `asyncStorageStore.ts` |
|---|---|---|
| mutation style | in-place: `blob.telemetry = mergeDailyRecord(blob.telemetry, …)` (`:171`) | rebuild: `memory = { ...memory, telemetry: mergeDailyRecord(memory.telemetry, …), updatedAt: Date.now() }` (`:457-465`) |
| `recordRunEnd` span | `:100-180` | `:369-…` (daily arm ends `:467`) |
| campaign gate | `:105-119` | `:382-399` |
| `telemetryKey` ternary | `:140-145` | `:420-425` |
| shared-path merge | `:146-152` | `:426-435` |
| endless arm | `:153-161` | `:436-447` |
| daily arm | `:162-178` | `:448-467` |
| tail | `return cloneBlob(blob);` at `:179` | `const snapshot = cloneBlob(memory);` at `:468`, then the hydration-chained persist |

**Where the evaluation goes (D-01), and it is not where the daily arm went.** The catalog reads
`lifetime` and all three `byMode` maps plus the endless and daily records (D-12), so the
evaluation must run **after** the shared `mergeRunIntoTelemetry` call and **after** both
mode-specific record merges, and **outside** every `if (args.mode === …)` block:

- `memoryStore.ts` — after the daily block closes at `:178`, before `return cloneBlob(blob)` at
  `:179`.
- `asyncStorageStore.ts` — after the daily block closes at `:467`, before
  `const snapshot = cloneBlob(memory)` at `:468`.

Placing it inside a mode gate is the D-12 failure the CONTEXT names (*"a catalog that only reads
`lifetime` would satisfy the letter of SC-5 and not its point"*), reached by a different route.

**The gate comment to extend, not rewrite** (`memoryStore.ts:120-122`, mirrored at
`asyncStorageStore.ts:400-402`):

```ts
      // Telemetry is mode-keyed BY DESIGN and stays OUTSIDE the gate — every mode
      // accumulates runs/bricks/ticks. A generated endless or daily board has no
      // catalog id, so each keys on its own constant instead of a LevelId.
```

That paragraph already establishes "outside the gate" as the house idiom for a mode-agnostic
write. The achievements evaluation is the second member of that category, and its comment should
say so and name D-12.

**One sub-problem here has no precedent — the delta.** See § No Analog Found item 1.

---

### `src/runtime/overlays/achievementLines.ts` (utility, pure classifier)

`13-UI-SPEC.md` § One shared pure classifier, two panels names two precedents. Both exist, both
were read, and their real locations are:

| Precedent | Location | What it gives |
|---|---|---|
| `waveBuildFailureKind` | **`src/runtime/overlays/ResultOverlay.tsx:61-68`**, JSDoc `:39-60`; consumed at `:140` (body copy) and `:150` (`showRunLines`); tested at `tests/ui/ResultOverlay.test.tsx:166-198` | the *argument* for naming a boundary rather than inlining a comparison |
| `countdownForm` | **`src/runtime/overlays/DailyResultOverlay.tsx:96-124`**, type `CountdownForm` `:68-72`, JSDoc `:59-66` and `:77-95`; consumed at `:264-266` and `:352-356`; tested at `tests/ui/DailyResultOverlay.test.tsx:93-157` | the *return shape* — a discriminated union of `{ kind, text, label }` |

The UI-SPEC quotes `countdownForm`'s JSDoc; the quote is accurate and is at `:63-66`:

```
 * An exported pure classifier rather than a JSX ternary, for the reason
 * `ResultOverlay.tsx`'s `waveBuildFailureKind` is one: so the visible line and the
 * spoken label can never disagree about which case they are in. Two readers deriving
 * the same boundary independently is how they come to disagree.
```

`CountdownForm` is the exact shape of `AchievementLine`:

```ts
export type CountdownForm =
  | { kind: 'omit' }
  | { kind: 'hours'; text: string; label: string }
  | { kind: 'minutes'; text: string; label: string }
  | { kind: 'under-a-minute'; text: string; label: string };
```

**A third, closer precedent the UI-SPEC does not name: `streakEndedCopy`
(`DailyResultOverlay.tsx:145-156`, JSDoc `:126-144`).** It is the one that models
`achievementLines`' totality requirement, because its JSDoc states exactly the principle the
UI-SPEC demands of the cap (*"Returns at most `ACHIEVEMENT_LINES_MAX` entries for any input …
The cap is a property of the component, not a promise by the host"*):

```
 * The `>= 2` guard is a TOTALITY fold, not a second derivation site. `endedStreakLength`
 * already applies the floor and never returns 1, so this branch is unreachable from the
 * real caller; it exists so the function is total over any number a future caller could
 * hand it …
```

```ts
export function streakEndedCopy(
  endedLength: number | null | undefined,
): string | null {
  if (endedLength == null || !Number.isFinite(endedLength) || endedLength < 2) {
    return null;
  }
  return `Your ${Math.floor(endedLength)}-day streak ended`;
}
```

#### On `certLevelPlan.ts` — read, and the verdict is split

`app/_components/certLevelPlan.ts` was read in full (88 lines). **It is the right precedent for the
*file extraction*, and the wrong one for everything else.** Its § Why this module exists
(`:9-20`) is the three-rounds-of-drift argument, and it is the only file in this repo where a rule
was pulled out of its consumers into a module of its own *because it had more than one reader*:

> The same question used to be written twice inside `runCertWorstCase` … and the two
> copies drifted apart in three consecutive rounds of phase 11. … The fix is structural
> rather than a fourth conjunct in a third place: the decision is named, written once, and
> read by every consumer.

Its purity constraint (`:51-53`) is also directly transferable — *"Pure: no React, no refs, no
side effects, and no import outside a `LevelId` type"* — and `achievementLines.ts` should carry
the same sentence with "no import at all".

**Where it is the wrong analog:**

- It returns a **bare string union** (`'force' | 'ready' | 'unreachable'`, `:62`), not a
  `{ kind, text, label }` record. `achievementLines` produces copy and spoken labels, so
  `CountdownForm` is the shape.
- It lives in **`app/`**, not `src/runtime/`, and its header says why (`:51-53`: `app -> core` is
  not an allowed boundaries edge). `achievementLines.ts` lives in `src/runtime/overlays/` — legal,
  per `eslint.config.js:303-313` (`runtime` may import `runtime`).
- It is a **decision** with one answer per input; `achievementLines` is a **projection** with a
  cap.

So: extract for `certLevelPlan`'s reason, in `countdownForm`'s shape.

**The honest gap:** no standalone pure-classifier *module* exists inside `src/runtime/` today —
both shipped classifiers are declared in the component file they serve and exported from it. The
extraction is correct (two consumers, and the UI-SPEC makes it contract) but it is a new file shape
for this tree. See § No Analog Found item 3.

**Layer check, re-derived:** `eslint.config.js:275-284` maps `src/runtime/**` to element `runtime`;
`:303-313` allows `runtime → core | runtime | render | vfx`. `src/runtime/overlays/achievementLines.ts`
importing nothing at all is trivially inside that. The panels importing it is `runtime → runtime`.
`npm run lint` (`package.json:59`) is the only mechanism observing this; no unit test does.

---

### `src/runtime/overlays/ResultOverlay.tsx` (component, leaf)

**Analog:** itself. Three patterns to copy inside the file being edited.

**(a) The conditional-line block** (`:189-204`) — the unlock block goes after the badge
(`:200-204`) and before the `Retry` `Pressable` (`:205`), per `13-UI-SPEC.md` § Where the block
sits. Every optional line is a ternary to `null`, never a disabled or greyed variant:

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

**(b) The suppression flag already exists and is not to be duplicated.** `showRunLines` is derived
once at `:150` from `failureKind` at `:140`, and its comment at `:149` is the exact sentence the
UI-SPEC reuses: *"The `Wave ·` / `Score ·` pair describes a RUN — at Retry time there is none."*
The unlock block gates on the same `showRunLines`, per `13-UI-SPEC.md` § When the block is
suppressed. `13-UI-SPEC.md` gives the reason in one sentence — *the block describes a run, and in
these two states there is no run* — which is `:149` again.

**(c) `styles.metric` is reused verbatim, and its values are the ones the row budget was computed
from** (`:277-285`, re-read today and matching `13-UI-SPEC.md` § The row model exactly):

```tsx
  metric: {
    color: '#FFFFFF',
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
```

`DailyResultOverlay.tsx:418-426` is byte-identical. **No new `StyleSheet` entry is added by this
phase** — `13-UI-SPEC.md` § Spacing Scale and § Color both say so.

**(d) The prop doc convention** (`:4-37`) — every prop's JSDoc names *which mode owns it* and what
breaks if it is misread. `unlockedAchievements?: readonly string[]` owes the sentence that it is
display-name **strings** and never an id, a record or a timestamp (D-08).

**Anti-pattern in the immediate neighbourhood:** `styles.starEmpty` (`#6B7280`) at `:286-304`.
`13-UI-SPEC.md` § Color measures it at 3.84:1 on the panel and fences it away from every readable
line. The unlock lines take `styles.metric` and nothing else.

---

### `src/runtime/overlays/DailyResultOverlay.tsx` (component, leaf)

**Analog:** itself, and it is the closer of the two panels because it already carries a spoken
label on a metric line.

**The `accessibilityLabel` on a `·` metric line** (`:314-319`) — exactly the convention
`13-UI-SPEC.md` § Accessibility labels extends:

```tsx
        <Text
          style={styles.metric}
          accessibilityLabel={`Streak: ${streak} days`}
        >
          Streak · {streak}
        </Text>
```

**The classifier-consumption pattern** (`:352-356`) — read `kind` for the presence test and
`text` / `label` from the same record, never re-derive either:

```tsx
        {countdown.kind !== 'omit' ? (
          <Text style={styles.metric} accessibilityLabel={countdown.label}>
            {countdown.text}
          </Text>
        ) : null}
```

`achievementLines()` returns an array, so the block is a `.map` over it with this body — and
`numberOfLines={1}` added, which `13-UI-SPEC.md` § The 16-character name budget flags as *"a
deliberate deviation from every other line in both panels"*. No other line in either file carries
it today (verified).

**Placement:** after the badge (`:347-351`) and **above** the countdown (`:352-356`), per
`13-UI-SPEC.md` § Where the block sits. Suppression rides the existing `isClosed` (`:253`), whose
comment at `:250-252` already states the one-flag rule: *"Every line that describes a CLOSED date
hangs off this one flag, so the failure variant cannot half-suppress."*

**The line-order comment block** (`:283-293`) is contract prose and must be extended, not left
stale — it currently enumerates ten rows and ends at `Menu`.

---

### `src/runtime/GameScreen.tsx` (component, router)

**Analog:** its own daily prop block and route — both added in phase 12 for exactly this reason.

**The prop-doc pattern that restates the layer rule for a reader** (`:35-42`):

```tsx
  /**
   * Which record domain the Results overlay is reading … `src/runtime` receives plain
   * numbers and a discriminant — it never imports the storage layer …
   * `'daily'` routes to `DailyResultOverlay`, a SEPARATE component.
   */
  mode: 'campaign' | 'endless' | 'daily';
```

The daily scalar props follow at `:43-95`, each with a `/** Daily only — … */` line naming the
storage field it mirrors. `unlockedAchievements` differs from all of them in one way worth a
comment: it is the **only** prop threaded to *both* branches of the route, so it is declared
outside the `daily*` group.

**The route** (`:270-301`) — the ternary narrows, which is what keeps `ResultOverlay.mode` at two
values (`:262-268` says so). The new prop is added to both arms:

```tsx
        {showResult ? (
          mode === 'daily' ? (
            <DailyResultOverlay … />
          ) : (
            <ResultOverlay … />
          )
        ) : null}
```

`13-UI-SPEC.md` § Props is explicit that `mode` is **not** widened and `DailyResultOverlay` stays
separate. Nothing about the phase-12 separation changes.

---

### `app/_components/PlayingHost.tsx` (host, controller)

**Analog:** its own daily machinery, added in phase 12. Four patterns.

**(a) Derive in the `app` tier, thread down as scalars** (`:360-369`) — the state block's JSDoc is
the D-08 argument already written:

```tsx
  /**
   * The Daily Result panel's scalars (12-05).
   *
   * Derived HERE, in the `app` tier, and threaded down as plain numbers, because the
   * overlay cannot import the storage layer at all — that prohibition is what makes
   * SC-5 checkable at the panel's prop signature rather than by tracing a branch.
   *
   * They are set from the STORED record on both paths that can raise the panel …
   * One derivation site, one renderer, so the two cannot disagree.
   */
  const [dailyStreak, setDailyStreak] = useState(0);
```

`13-UI-SPEC.md` § Surfaces Touched puts the id→display-name mapping here for the same reason:
*"The `src/services` → string conversion happens here, above the runtime boundary."*
`eslint.config.js:323-341` allows `app → services`; `:303-313` forbids `runtime → services`.

**(b) The single publication site** (`:951-974`, `publishDailyPanel`, JSDoc from `:910`). This is
the pattern to copy if the unlock names must be shown on more than one path — and they must not:
`13-UI-SPEC.md` § Ordering is contract says the names come from *this run's* diff, so the re-open
path shows none. **State that as an absence, the way `publishDailyPanel`'s JSDoc states its
inverse** (`:920-925`): *"a separate 'just finished' publication reading in-memory run state would
be a second renderer for one truth, and if two can disagree, one is wrong and no test says which."*

```tsx
  const publishDailyPanel = useCallback(
    (record: DailyRecord | null | undefined, date: string) => {
      const history = Array.isArray(record?.history) ? record.history : null;
      …
      setDailyEndedStreakLength(endedStreakLength(keys, date));
      …
    },
    [],
  );
```

Note the defensiveness: every read is `Array.isArray(...)` or `typeof ... === 'number'` guarded,
because *"the storage rule for this phase is that a read failure or a sanitiser degrade renders
zeros, never an error modal"* (`:933-935`). `13-UI-SPEC.md` § Error state asks for the same.

**(c) The synchronous post-merge read off `recordRunEnd`'s return** (`:1016-1047`) — the shape the
achievements arm must reuse:

```tsx
        const blob = store.recordRunEnd({
          mode: 'daily', date: runDate, score: runScore, outcome, livesRemaining, stats,
        });
        // The same synchronous post-merge read the endless arm does below — the blob
        // `recordRunEnd` RETURNS already carries the merged `telemetry.daily`, so this
        // reads the value the merge just produced rather than racing a second
        // `getSnapshot()`. …
        const merged = blob.telemetry?.daily;
```

**This works for the daily panel and does not work for the achievements diff.** See § No Analog
Found item 1 — the daily arm re-derives *state*, which survives the write; a set difference does
not.

**(d) Prop threading, state not ref** (`:2637-2678`), with the comment that decides it (`:2646-2647`):

```tsx
        // The `mode` STATE, not `modeRef` — the overlay has to re-render on the flip,
        // and a ref read during render would hand it the pre-flip value.
        mode={mode}
```

The unlocked-names array is React state for the same reason.

**Anti-pattern one file away:** `handleRunEnded`'s opening comment (`:984-992`) is the phase-11
gap-2 post-mortem — *"**the mode branch happens FIRST**"*. The achievements evaluation is
deliberately **not** inside any of the three arms. Adding it to each arm "so each mode gets it" is
the D-01 rejection (one rule in two places) wearing a third hat.

---

### `tests/achievements.catalog.test.ts` (test, pure)

**Two analogs, for two different rows of `13-VALIDATION.md`.**

**(a) The exhaustive table with a derived domain** — `tests/ui/certLevelPlan.test.ts:1-44`. Its
header states the rule the catalog test needs verbatim (`:13-18`):

```
 * WHY THE DOMAIN IS DERIVED AND NOT LISTED. The level half of the domain is the set of
 * playable levels, and that set belongs to `src/services/storage/catalog.ts`, not here.
 * A hand-written list would go on passing while a sixth playable level escaped the
 * table entirely. `PLAYABLE_LEVEL_ORDER` is read at runtime and compared against the
 * list the table quantifies over, so a catalog change reds this file instead of
 * silently shrinking its coverage.
```

That is the answer for `-t "ids unique"`, `-t "name within 16 chars"` and `-t "three modes"`:
quantify over the exported catalog, and assert set-equality between the table's claimed domain and
the shipped one. It also settles the environment — `@vitest-environment node` at `:2`, with
*"Plain vitest, node environment, no jsdom and no mocks — the subject is pure"* at `:20`.

**(b) The source-contract scan for `-t "no clock no storage"`** — `tests/core.purity.test.ts:1-45`.
This is the only idiom in the repo that asserts a *source-level* purity property, and it is
directly reusable:

```ts
/** D-13: simulation must never call host RNG or wall-clock */
const FORBIDDEN_RNG_CLOCK = /Math\.random|Date\.now|performance\.now/;

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });

  it('contains no Math.random or wall-clock reads (D-13)', () => {
    const offenders = walk('src/core')
      .filter((p) => !p.includes('.test.'))
      .filter((p) => FORBIDDEN_RNG_CLOCK.test(readFileSync(p, 'utf8')));
    expect(offenders, 'D-13: core/ must not use …').toEqual([]);
  });
```

Point `walk` at `src/services/achievements` and add `from '.*storage` to the forbidden pattern.
**Note there is a lint alternative and it is already precedented:** `eslint.config.js:176-208` is a
`files: ['src/services/daily/**/*.ts']` block with four `no-restricted-syntax` selectors, each
carrying the measured reason it exists. A `src/services/achievements/**` block would make
`npm run lint` the gate instead. Either is legitimate; the source scan is the one
`13-VALIDATION.md` currently budgets a test case for.

**(c) The no-literal-dials rule** — `tests/endless.ramp.test.ts:15-20`: *"No assertion in this file
pins a literal dial constant … a test that pinned one would fail the moment it is legitimately
re-tuned."* D-11 says every threshold is a judgement, so the catalog test asserts **shape and
derived properties** (ids unique, names ≤ 16, every mode represented, every predicate total), never
`expect(BRICKS_THRESHOLD).toBe(10_000)`.

---

### `tests/achievements.evaluate.test.ts` (test, pure)

**Analog:** `tests/endless.ramp.test.ts:1-37`. Copy the header structure — it names the criterion,
names the file whose shape it copied, names the idiom it borrowed with a line reference, states the
no-literal-dials rule, and closes with a *"Deliberately NOT covered here"* paragraph so its silence
is not read as coverage:

```
 * Analog: `tests/levelgen.schedule.test.ts` — the same loop-the-whole-range shape and the
 * same `expect(value, 'why')` second-argument convention …
 *
 * Deliberately NOT covered here: whether a *generated board* actually realises its
 * difficulty. That is exact-weight equality in `tests/levelgen.sweep.test.ts`, a Phase 10
 * asset, and it stays there — this file is about the policy alone.
```

Constants-at-the-top, each named with the reason it exists (`:30-37`):

```ts
/** The wave at which the walk first reaches the ceiling: wave 1 is difficulty 0. */
const CLAMP_WAVE = D_MAX + 1;
/** Far past any reachable wave — the clamp must hold without a bound anybody tuned. */
const FAR_WAVE = 10000;
```

For `-t "same snapshot twice"` and `-t "does not re-fire"`, the shipped idiom for a
determinism/uniqueness claim is `new Set(...).size` (cited at `tests/endless.ramp.test.ts:12` as
borrowed from `tests/levelgen.determinism.test.ts:52`).

The `-t "hostile snapshot"` row's model is `tests/daily.streak.test.ts`'s degenerate-input cases,
which exist because `streak.ts:32-35` promises the degenerate case *"fails safe and is asserted
that way rather than assumed."*

---

### `tests/achievements.record.test.ts` (test, store) — a merge of two analogs

`13-VALIDATION.md` asks this one file to do two things that no single shipped file does.

**From `tests/storage.daily-firewall.test.ts` — the both-stores harness.** The parameterisation is
`:91-97` and the two instantiations are `:284-287`:

```ts
/**
 * One suite body, run against each store implementation. Both stores implement the same
 * `ProgressStore` interface, and SC-5 is a claim about that interface — so the assertions
 * are identical by construction and a gate that lands in only one store fails here loudly.
 */
function firewallSuite(label: string, makeStore: () => ProgressStore): void {
  describe(`daily firewall — ${label} (SC-5 / N-DAILY-03)`, () => { … });
}

firewallSuite('memory store', () => createMemoryProgressStore());
firewallSuite('AsyncStorage-backed store', () =>
  __createAsyncStorageProgressStoreForTests(fakeAsyncStorage()),
);
```

with the async double at `:55-65`:

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
```

**From `tests/daily.record.test.ts` — the read/write-path case set** (`:136`, `:239`, `:282`,
`:555`, `:567`, `:842`), and its header's statement of what it does *not* cover (`:28-32`), which
is the discipline `13-VALIDATION.md`'s non-vacuity rule turns into a requirement.

#### Non-vacuity, which is the reason `13-VALIDATION.md` names this file

The firewall file's header states the rule at `:19-22`:

> Three cases here have NO endless counterpart and are written fresh:
>   1. *the daily write LANDED*. A firewall suite that only asserts absence passes
>      trivially when the write was dropped altogether, so absence is always paired with
>      presence …

It is discharged **three separate ways**, and all three transfer:

**(i) The paired presence case** (`:157-183`) — the absence suite's companion:

```ts
    it('the same daily win DOES land: the date joins the history and the aggregate bumps under the constant key', async () => {
      …
      const entry = after.telemetry.daily.history.find((e) => e.date === TODAY);
      expect(entry, `the daily history must contain an entry for ${TODAY}`).toBeDefined();
      expect(entry?.score).toBe(8_400);
      …
      expect(after.telemetry.byMode.campaign).toEqual({});
      expect(Object.keys(after.telemetry.byMode.daily)).toEqual([DAILY_TELEMETRY_KEY]);
    });
```

**(ii) The pre-seeded non-vacuity guard inside an absence case** (`:124-155`) — assert the thing
being preserved is *non-default first*, with the message saying so:

```ts
      const before = await store.getSnapshot();
      expect(
        before.telemetry.endless,
        'the endless record must be non-default here, or this case is vacuous',
      ).toEqual({ bestWave: 21, bestScore: 9_000 });
```

This is the direct model for D-15's *"degrades alone"* row: seed a real unlock set, corrupt it,
and assert both that it degraded **and** that campaign/endless/daily survived — with a prior
assertion proving each of those was non-default.

**(iii) The "the gate did not break the existing path" case** (`:185-217`) — a campaign win driven
through a store that has already taken the new kind of write.

**Two more cases from this file that transfer directly:**

- The cardinality alarm (`:219-255`) with its failure message naming the defect
  (`:240-243`). The achievements counterpart is D-15's bound: after N runs and a hostile blob, the
  stored unlock collection holds at most the catalog's size.
- The `@ts-expect-error` compile-time half (`:257-280`), with its comment at `:263-266` explaining
  why the prose must not start a line with the directive token. **Whether this transfers depends on
  whether the planner changes `ProgressStore.recordRunEnd`'s signature** (§ No Analog Found item 1).

**The assertion-granularity rule** (`:32-34`), which this phase inherits: *"Assertions are on
cardinality and on absence, never a whole-object equality over the daily record."* The reason given
is that a later plan adds fields. Phase 14 will read this record; assert field by field.

---

### `tests/ui/achievementLines.test.ts` (test, pure classifier)

**Analog:** `tests/ui/DailyResultOverlay.test.tsx:93-171` — the two pure-classifier `describe`
blocks (`countdownForm` at `:101-157`, `streakEndedCopy` at `:159-171`) that sit above the
component cases in the same file, each with a JSDoc naming why the function is named rather than
inlined (`:93-100`).

**One correction to `13-VALIDATION.md` worth making at plan time.** It types this row *"unit
(jsdom)"*. The subject is a pure function with no React and no DOM, and the shipped precedent for
exactly that is `tests/ui/certLevelPlan.test.ts`, whose first line is `@vitest-environment node`
(`:2`) with the reason at `:20`. `vitest.config.ts` runs `node` by default and jsdom is opt-in
per file, so **omitting the docblock is the correct action** — the file is `.ts`, not `.tsx`, and
needs neither the safe-area mock nor `cleanup`. Splitting the classifier's cases out of the two
component files (which `13-VALIDATION.md` does, and `12-05` did not) is what makes this possible.

The case list is `13-UI-SPEC.md` § What jsdom can observe, and must — nine bullets, each owing a
case.

---

### `tests/ui/ResultOverlay.achievements.test.tsx` (test, component)

**Analog:** `tests/ui/DailyResultOverlay.test.tsx`, which is itself a documented copy of
`tests/ui/ResultOverlay.test.tsx` and states so at `:4-8`.

**Harness** (`:18-33`):

```tsx
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { DailyResultOverlay, countdownForm, streakEndedCopy } from '../../src/runtime/overlays/DailyResultOverlay';

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

afterEach(cleanup);
```

**The `base`-with-everything-suppressed idiom** (`:42-62`) — and its rationale is precisely what the
suppression cases need:

```tsx
/**
 * A closed date with every optional line suppressed: no ended streak, no badge.
 *
 * Each case adds back exactly the one thing it is about, which is what keeps an
 * absence assertion meaningful — a `base` that already rendered everything would make
 * "renders no Retry" true for the wrong reason.
 */
const base = { … };
```

**The ordering helpers** (`:64-91`), whose independent-`indexOf` rationale is load-bearing:

```tsx
/**
 * Position of each line in the rendered text — -1 when absent.
 *
 * Each `indexOf` starts from 0, INDEPENDENTLY. Advancing a cursor past the previous
 * match would make the returned array monotonic by construction and the ordering
 * assertion green no matter what order the component rendered.
 */
function lineOrder(lines: string[]): number[] {
  const text = document.body.textContent ?? '';
  return lines.map((line) => text.indexOf(line));
}
```

**The absence-with-positive-control case** (`:305-334`) — the model for the two suppression states
`13-UI-SPEC.md` E3 requires, including the message-as-argument convention:

```tsx
    expect(
      screen.queryByText('Retry'),
      'D-06 gives one attempt per date, and a control the rule forbids is ABSENT rather than greyed …',
    ).toBeNull();
    …
    const controls = screen.getAllByRole('button');
    expect(controls.length, 'Menu is the only control on a closed date').toBe(1);
```

**The what-this-file-is-not-evidence-about header** (`:10-16`) is mandatory here and its text
transfers almost unchanged — `13-UI-SPEC.md` § Measurement Provenance registers four backstops and
says in terms that *"A passing jsdom render is not evidence that the panel fits."*

**The standing-prohibition case** (`:357-…`, *"carries no shaming, guilt or loss-aversion framing
and no offer to restore, protect, freeze or buy back a streak"*) is the model for
`13-UI-SPEC.md` § Standing Prohibitions, which extends that list with six achievement-specific
shapes.

---

### `tests/storage.progress-v4.test.ts` (test, parser) — extended

**Analog:** its own `describe('sanitizeDailyRecord — bounded on read, every stored key validated
(12-04)')` at `:422-724`. The new block is a sibling of it, and the endless block at `:280-378` is
the smaller earlier version of the same shape.

**The parse harness** (`:425-437`) — every case goes through a full blob with a known campaign
payload, so independence is asserted in every case rather than in one:

```ts
  /** A v4 blob with a known campaign payload and a caller-supplied daily record. */
  function parseWithDaily(daily: unknown) {
    return parseProgressResult(
      JSON.stringify({
        v: 4,
        unlocked: PLAYABLE_LEVEL_ORDER.slice(0, 2),
        bestByLevel: { [first]: { score: 500, stars: 1 } },
        bestScore: 500,
        updatedAt: 7,
        telemetry: { ...defaultTelemetryBlob(), daily },
      }),
    );
  }
```

**The fixture-not-derived rule** (`:439-443`) — a sharp one, and it applies to achievement ids too:

```
   * `count` consecutive ISO keys from 2025-01-01, built by UTC counting rather than through
   * `localDateKey`. This is a FIXTURE: deriving it with the very function the parser's
   * validator guards would let a broken pair agree by computing the same wrong answer twice.
```

The corollary for this phase: the unknown-id case must use a **literal** unknown id, not
`catalog[0].id + '-x'`.

**The case that proves D-13 outright** (`:689-723`) — the no-migration case, and the direct copy
target:

```ts
  it('an existing v4 blob written before the daily record existed parses with the field defaulted and every campaign field intact — no version bump, no migration', () => {
    const oldTelemetry = { lifetime: …, byMode: …, endless: …, recentRuns: [] };
    expect(Object.keys(oldTelemetry)).not.toContain('daily');
    …
    expect(r.status).toBe('ok');
    expect(r.progress.v).toBe(PROGRESS_VERSION);
    expect(r.progress.telemetry.daily).toEqual(defaultDailyRecord());
    expect(r.progress.telemetry.endless).toEqual({ bestWave: 3, bestScore: 900 });
    …
  });
```

**The independence case** (`:656-688`, *"a fully corrupt daily record leaves unlocked, bestByLevel,
bestScore, stars and the endless record intact"*) is D-15's *"degrades alone"* at the parse
boundary; `tests/achievements.record.test.ts` owns the store-level half.

---

## Shared Patterns

### Doc-comment-as-contract

**Source:** canonical instances `src/services/storage/types.ts:392-404` (`RecordRunEndArgs`),
`src/services/storage/telemetry.ts:103-121` (`mergeDailyRecord`),
`src/services/storage/parseBlob.ts:485-506` (`sanitizeDailyRecord`),
`src/runtime/overlays/ResultOverlay.tsx:39-60` (`waveBuildFailureKind`),
`src/services/daily/streak.ts:98-127` (`endedStreakLength`).
**Apply to:** every file in this phase.

The house style is that a non-obvious construct carries **the reason it is that way, what breaks if
it changes, and the decision id** — and, in the sharpest instances, a MEASURED number
(`telemetry.ts:348-351`, `:709-717`) and a "this paragraph exists because a later reader will
otherwise 'fix' it" note (`streak.ts:115-122`). A file that only describes what the code does reads
as foreign in this tree.

### The `expect(value, 'why')` second argument

**Source:** `tests/storage.daily-firewall.test.ts:137-140`, `:173`, `:240-243`;
`tests/endless.ramp.test.ts` throughout; `tests/ui/DailyResultOverlay.test.tsx:305-334`.
**Apply to:** all five new test files and both extended ones.

The message is not decoration — in the firewall file it is where the *reason the case is not
vacuous* is recorded, and in the cardinality alarm it is where the defect being watched for is
named.

### Bound on write AND on read

**Source:** write `src/services/storage/telemetry.ts:171` and `:524`; read
`src/services/storage/parseBlob.ts:528-529` and `:604-605`; the constant with its arithmetic
`src/services/storage/types.ts:55-71`.
**Apply to:** the unlock collection, in `types.ts`, `telemetry.ts` and `parseBlob.ts`.

```ts
    // Bound on read as well as on write — a tampered blob cannot grow the window.
    out.history = entries.slice(-DAILY_HISTORY_BOUND);
```

The write bound is what the decision asks for; the read bound is what makes it hold against a blob
written by an older build or edited on a rooted device. `sanitizeAggregateMap`
(`parseBlob.ts:535-551`) is the counter-example living in the same file — no cap, every key
preserved, forever.

### Degrade downward, in the playable / under-reporting direction

**Source:** `parseBlob.ts:553-574` (the `sanitizeTelemetry` independence contract),
`:398-414` (drop rather than repair), `:434-451` (`sanitizeStreakStart`, *"always in the
UNDER-reporting direction"*), `telemetry.ts:400-402`.
**Apply to:** the achievements sanitizer, the evaluator's hostile-snapshot handling, and every
error row in `13-UI-SPEC.md` § Error state.

The direction is chosen and stated everywhere in this tree: *"a lifetime best invented out of a
tampered blob is a worse failure than one that stopped growing."* **For achievements the direction
inverts on one field** — D-17 makes an unlock one-way, so a malformed *timestamp* must not cost the
unlock. Say which direction each field degrades in, and why, at the field.

### Scalar-props leaf overlays

**Source:** `src/runtime/overlays/ResultOverlay.tsx:1-2` (the entire import surface of an overlay),
`src/runtime/overlays/DailyResultOverlay.tsx:16-23` (the rationale, written out),
`src/runtime/GameScreen.tsx:35-42` (restated for a reader), the rule at `eslint.config.js:303-313`.
**Apply to:** both panels, `achievementLines.ts`, `GameScreen.tsx`.

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```

That is the whole import block of a shipped overlay. `13-UI-SPEC.md` § Props and `13-VALIDATION.md`
both state the same uncomfortable fact: **`npm run lint` is the only mechanism observing this
boundary. No unit test does.** Run it as a gate.

### Two hand-mirrored stores, asserted separately

**Source:** `src/services/storage/memoryStore.ts:130-135` == `asyncStorageStore.ts:410-415` (the
same measured paragraph in both); the harness at `tests/storage.daily-firewall.test.ts:91-97` and
`:284-287`.
**Apply to:** both stores and `tests/achievements.record.test.ts`.

This is the most-repeated obligation in the codebase and it has been paid in phases 9, 11 and 12.
Budget for it.

### Test header states its analog, its defect, and its non-coverage

**Source:** `tests/endless.ramp.test.ts:1-25`, `tests/storage.daily-firewall.test.ts:1-38`,
`tests/daily.record.test.ts:1-33`, `tests/ui/DailyResultOverlay.test.tsx:1-19`.
**Apply to:** all seven test files.

Each header names the criterion or defect the file exists for, the file whose shape it copied (with
line references), and what it deliberately does not cover so its silence is not mistaken for a
passing claim. `tests/ui/DailyResultOverlay.test.tsx:10-16` is the sharpest instance and the one
this phase most needs, because four of its claims are device backstops.

---

## No Analog Found

Two files carry a sub-problem with **no in-repo precedent**, and one file shape is new. These are
not "no analog" at the file level — the three have good file-level analogs above — but the planner
must not expect to copy these particular pieces from anywhere, and a forced analog here would be
worse than the gap.

### 1. The newly-unlocked delta crossing the store boundary — the sharpest gap in the phase

`ProgressStore.recordRunEnd` returns `ProgressBlob` and nothing else (`types.ts:461`; implemented
at `memoryStore.ts:179` and `asyncStorageStore.ts:468`). The daily arm gets away with reading its
panel values off that return (`PlayingHost.tsx:1031-1047`) because those values are **state** that
survives the write. **D-02's set difference does not:** by the time `recordRunEnd` returns, the
union has been persisted, and `newly unlocked` is not recoverable from the post-write blob.

`13-CONTEXT.md` § Claude's Discretion leaves this open in exactly these words: *"Whether the diff in
D-02 is computed inside the storage layer or handed to it."* The two roads and what each costs:

| Option | Shape | Cost |
|---|---|---|
| **A** — the host reads the stored set **before** the write and diffs after | No interface change. `PlayingHost` calls `store.getSnapshot()` (async) or holds a ref of the last-known set, then diffs against the returned blob | `getSnapshot()` is `Promise<ProgressBlob>` and `handleRunEnded` is synchronous at the point of the write (`:1016`); a ref mirror is a second copy of the unlock set in the host, which is the "one rule in two places" shape D-01 exists to refuse. D-01 also says *"one call site, one snapshot, no extra storage read"* — a pre-read is an extra storage read |
| **B** — `recordRunEnd` returns the delta | The return type widens, e.g. `ProgressBlob & { newlyUnlocked?: readonly AchievementId[] }` or a wrapper | Changes `ProgressStore` (`types.ts:450-466`), both store implementations, and every existing caller and mock — including `tests/ui/PlayingHost.endless-run.test.tsx`'s and `PlayingHost.daily-run.test.tsx`'s mocked stores. **No precedent: `recordRunEnd` has returned `ProgressBlob` unchanged since Phase 9** |

**A plan that says "the host shows the newly-unlocked names" without naming A or B produces a
silent no-op**, exactly as phase 12's foreground-refresh conflict would have. This belongs at a
decision checkpoint, not in an action.

### 2. A `src/services/<mode>/` module that reads a storage-shaped snapshot

Verified by grepping every import in both trees: `src/services/daily/**` and
`src/services/endless/**` contain five import statements between them, all local (`./dateKey`) or
to `src/levelgen`. Neither names a storage type. `daily/streak.ts` takes `readonly string[]`; the
one function in the repo that takes a `DailyRecord` is `currentDailyStreak`, and it lives **inside**
storage at `telemetry.ts:455-457`.

D-03 wants the evaluator pure in `(catalog, snapshot, unlocked set)`, and the snapshot is
telemetry-shaped. Three shapes are available and none is precedented:

- a **type-only** import of `TelemetryBlob` from `../storage/types` — legal
  (`eslint.config.js:364-373`, `services → services`), creates no runtime edge, but is the first
  time a policy module names a storage type;
- a **structural** snapshot type declared in `achievements/` that `TelemetryBlob` happens to
  satisfy — no import at all, at the cost of a second declaration of the 16 aggregate field names
  that `13-CONTEXT.md` explicitly says must not be restated;
- the **`currentDailyStreak` placement**: put the record-shaped entry point in `telemetry.ts` and
  keep `achievements/` primitive-only — the shipped precedent for the *placement*, though it splits
  the evaluator across two layers and puts part of a pure policy inside the storage module.

Choose deliberately and say which. Note that a **value** import of `storage/types` from
`achievements/` combined with a value import of `achievements/` from `parseBlob.ts` or the stores
would be a module cycle; a `import type` does not create one.

### 3. A standalone pure classifier module inside `src/runtime/`

`waveBuildFailureKind` (`ResultOverlay.tsx:61-68`) and `countdownForm` / `streakEndedCopy`
(`DailyResultOverlay.tsx:96-124`, `:145-156`) are all declared **in the component file they serve**
and exported from it. `13-UI-SPEC.md` makes `src/runtime/overlays/achievementLines.ts` a separate
file because it has two consumers, which is correct and is `app/_components/certLevelPlan.ts`'s
reason — but `certLevelPlan.ts` sits in `app/`, returns a bare string union, and its header
explains a placement decision that does not apply here. The new file is a legitimate new shape for
`src/runtime/`, not a copy.

### Sub-problems with no precedent inside otherwise-exact analogs

| File | Sub-problem | Why no analog |
|---|---|---|
| `src/services/storage/parseBlob.ts` | two different failure rules inside one entry sanitizer — **drop** on a bad id, **default** on a bad timestamp | `sanitizeRunLogEntry` (`:357-389`) and `sanitizeDailyHistoryEntry` (`:398-432`) both drop the whole entry on any field failure. D-15 + D-17 require the timestamp not to cost the unlock. The rule must be written into the JSDoc or it will be "unified" later |
| `src/services/storage/telemetry.ts` | merging a keyed collection where the **earliest** value wins | `mergeDailyRecords:584-587` states the opposite rule (`incoming` wins) for good reasons that do not hold here. The `Map`-keyed union shape (`:621-630`) transfers; the tiebreak does not |
| `tests/achievements.catalog.test.ts` | a string-length assertion over exported data | Nothing in `tests/` asserts a copy-length budget today. `tests/ui/certLevelPlan.test.ts:13-18`'s derive-the-domain idiom is the closest shape, not the same assertion |

---

## Drift corrections

Three citations found stale while re-deriving. Recorded rather than silently restated, per the
house rule.

| Stale citation | Where it appears | Measured today |
|---|---|---|
| `tests/ui/ResultOverlay.test.tsx:143-154` for `lineOrder` | `tests/ui/DailyResultOverlay.test.tsx:70` | `:143-150` is the JSDoc, `:151-154` is the function. The cited range is off by the JSDoc's opening line and the file has since grown a `base` extension at `:140-141`. Minor, but the *function* is at `:151` |
| `memoryStore.ts:95-137` / `asyncStorageStore.ts:367-420` for `recordRunEnd` | `12-PATTERNS.md` § File Classification | `recordRunEnd` now spans `memoryStore.ts:100-180` and `asyncStorageStore.ts:369-…` (daily arm ends `:467`). Both grew ~40 lines when the daily arm landed |
| `parseBlob.ts:337-347` / `:401-414` / `:427` / `:442-443` | `12-PATTERNS.md` throughout | All shifted by the daily sanitizers. Now: `sanitizeEndlessRecord` `:345-355`, `sanitizeTelemetry` JSDoc `:553-574`, the daily wiring `:589`, the recentRuns read bound `:604-605` |

Also worth flagging, though not a citation: **`13-VALIDATION.md` types
`tests/ui/achievementLines.test.ts` as "unit (jsdom)".** The subject is pure and the shipped
precedent for that case (`tests/ui/certLevelPlan.test.ts:2`) is `@vitest-environment node`. See
that file's assignment above.

---

## Metadata

**Analog search scope:** `src/services/**` (storage, daily, endless), `src/runtime/**`,
`src/runtime/overlays/**`, `app/_components/**`, `tests/**`, `tests/ui/**`, `eslint.config.js`,
`package.json`, `scripts/`
**Files read this session:** 26 — all verified tracked with `git ls-files -- <path>`, 0 untracked,
0 gitignored mirrors
**HEAD measured at:** `0b0e7e0005e5bbde29cbc8dfcddc3a6e84aaf5b10`
**Pattern extraction date:** 2026-09-28
