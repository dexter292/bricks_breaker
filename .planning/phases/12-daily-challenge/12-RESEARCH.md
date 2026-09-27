# Phase 12: Daily Challenge - Research

**Researched:** 2026-09-27
**Domain:** Local-calendar-date derivation on Hermes / React Native; reuse of an existing seeded generator and a shipped v4 storage blob
**Confidence:** HIGH on the one open question (executed under the exact shipped Hermes build); HIGH on the in-repo constraints (read from source this session); MEDIUM on the two Android-only items, which are flagged for device verification

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Date, clock and the one rule that covers them**

- **D-01: A date is playable if and only if it has no stored result.** This single rule is
  the whole clock policy. It is what N-DAILY-03 requires to be written down, and it is
  written here rather than left to emerge from code.
- **D-02: Clock backwards → a date that already has a result is read-only.** Opening it
  shows the stored result; it cannot be replayed. Winding the clock back gains nothing.
- **D-03: Clock forwards → playable, and the streak breaks by itself.** A player who jumps
  a week ahead can play the new date, but the intervening dates have no stored result, so
  D-11's computation breaks the streak with no anti-cheat branch anywhere in the code.
- **D-04: Timezone travel is not distinguished from clock tampering.** The same rule (D-01)
  covers both. Offline and without a trusted time source the two are not distinguishable,
  so any special case would be a guess dressed as a policy.
- **D-05: No monotonic date watermark is stored.** The set of dates that have a result is
  the only state the policy reads. Rejected: a "highest date ever seen" field — it is a
  second thing that can corrupt independently, and SC-3's whole point is deriving state
  from stored dates rather than from a separate counter.
  — **Reversibility:** reversible — adding a watermark later is additive to the blob and
  changes no existing field.

**One attempt per date**

- **D-06: One attempt.** Entering the day's board commits to it; there is no retry within
  the date. The roadmap goal asks for "a streak they would be annoyed to lose", and an
  unlimited retry makes nothing losable.
- **D-07: Win or lose closes the date. Abandoning does not.** Exiting mid-run leaves the
  date open, so a real interruption (a phone call) does not cost the day. This deliberately
  departs from Phase 9 D-02's treatment of `abandoned` as a real outcome — `abandoned` is
  still recorded in telemetry (D-09), it just does not close the date.
- **D-08: The practice hole is ACCEPTED and recorded, not closed.** Because the board is
  derived from the date, exiting before the final life and re-entering returns the *same*
  board. A determined player can therefore rehearse. There is no re-roll (the board never
  changes), only rehearsal. Closing it would mean making `abandoned` close the date, which
  costs every interrupted player their day. Named here so a later round finds a decision
  rather than a defect.
- **D-09: Telemetry records every attempt, under Phase 9's existing rules.** `byMode.daily`
  accumulates like `campaign` and `endless`, including runs that did not close the date.
  Lifetime statistics are a separate question from "the result of the day", and keeping
  them consistent across modes is what makes Phase 14's comparisons honest.

**The daily board**

- **D-10: One board, not a wave sequence.** Clearing it wins, running out of lives loses.
  The roadmap goal and SC-1 both say "the board" in the singular. This reuses the campaign
  run path unchanged and does not touch Phase 11's wave loop.
  — **Reversibility:** costly — moving to a wave sequence later would change the shape of
  the stored daily result and every reader of it.
- **D-11: Difficulty is a fixed constant, mid-scale.** Every date uses the same difficulty
  on Phase 10's `0..20` scale. Scores are comparable across dates, and no player loses a
  streak because their date drew a hard board. Rejected: day-of-week ramps and
  date-derived random difficulty — both make streak loss partly a matter of luck.
- **D-12: No stars for daily — score and outcome only.** Star thresholds in `stars.ts` are
  authored per campaign level; a generated board has none. Inventing a formula would need
  its own calibration and a sweep to prove it is not absurd at either end of the scale.
  Keeping stars campaign-only also serves SC-5 directly.

**Streak**

- **D-13: The streak counts dates PLAYED, not dates won.** Win or lose, a closed date keeps
  the streak. SC-3 says "consecutive played dates", and pairing a win requirement with
  D-06's single attempt would end a long streak on one unlucky board.
- **D-14: One missed date breaks it.** Two closed dates that are calendar-adjacent continue
  a streak; a gap of two or more days ends it. No grace day — "consecutive" then means what
  it says, and the computation is a walk over the sorted set of stored dates with no extra
  state.
- **D-15: Daily history is a bounded window of recent dates**, following Phase 9 D-05's
  reasoning for `RECENT_RUNS_BOUND` — the blob is read whole on every app open, so nothing
  in it may grow without limit.
- **D-16: Two unbounded scalars survive the window: longest streak ever, and total dates
  played.** Without these, trimming history would silently erase an achievement, and a
  streak longer than the window would read as the window length. They are updated when a
  date closes, never recomputed from the trimmed window.
  — **Reversibility:** one-way — once players have accumulated these numbers there is no
  way to reconstruct them from a trimmed history, so a later schema change must migrate
  them rather than recompute them.
- **D-17: Breaking a streak is stated, with the length that ended.** "Your 12-day streak
  ended" rather than a silent reset to 1. The loss is the point of the feature.

### Claude's Discretion

- How the local calendar date is turned into the seed for `generate(seed, difficulty)`.
  It must be pure, must depend on the local calendar date alone (SC-1), and must give the
  same board for the same date on any device.
- The exact fixed difficulty constant for D-11, and the exact window size for D-15.
  Both are single numbers; pick them with the same reasoning Phase 9 used for
  `RECENT_RUNS_BOUND` and state the reasoning.
- The stored shape of the daily result and the date key format, within Phase 9's existing
  v4 blob. `byMode.daily` already exists and is already sanitized.
- Where the streak and the countdown appear on screen, and the countdown's exact wording.
- The entry point. Phase 11 D-05 used a temporary `__DEV__` button on the HUD, deleted by
  Phase 14 when the real Title entry lands. The same treatment is the default here unless
  the UI-SPEC step decides otherwise; it must not appear in a production build.

### Deferred Ideas (OUT OF SCOPE)

- **Streak freeze / grace day.** Considered and rejected at D-14 for this phase. If player
  feedback later shows one missed day is too harsh, it is an additive change — but it
  makes "consecutive" stop meaning consecutive, and that has to be said in the UI.
- **Stars or a second scoring axis for generated boards.** Rejected at D-12. Would need a
  threshold formula calibrated against a board sweep; that is its own piece of work.
- **Cross-device or social comparison of daily results.** Out of scope by PROJECT.md — no
  server, no account, no store.

### Also binding: `12-UI-SPEC.md` (approved, 7/7 dimensions)

The UI contract is **not re-opened by this document.** Everything it pins — panel line
order, the streak-ended derivation, the badge rule, the three countdown forms, the
open/closed control rule, `DailyResultOverlay` as a new component, `now` as an injected
prop, the `__DEV__` `Daily` control's position — is inherited verbatim. Where this research
touches a UI-SPEC claim it is to supply the **implementation evidence** the contract assumed
(see § The Local Calendar Date, which confirms UI-SPEC § Clock policy rules 2 and 3 with an
executed probe), or to name a **consequence** the contract did not have the data to see
(§ Pitfall 6, the reachable `25h 0m` countdown; § Pitfall 7, the missing `onForeground` hook).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **N-DAILY-01** (FC-R03) | The board derives from the local calendar date alone — same date, same board, no network | § The Local Calendar Date gives the exact derivation and proves, by execution under the shipped Hermes build, that it is locale-, calendar- and DST-invariant. § Seed Diffusion shows 731 consecutive date keys give 731 distinct boards. `generate` already accepts a string seed (`src/levelgen/generate.ts:223`), so no hashing step is added. No network call appears anywhere in the recommended path. |
| **N-DAILY-02** | The day's result is recorded once per date and shown on re-open rather than regenerated; a streak is computed from stored dates, not an incrementable counter | § Architecture Patterns gives the storage shape (a new `TelemetryBlob.daily` record alongside the existing `TelemetryBlob.endless`), the bounded-on-write/bounded-on-read precedent (`telemetry.ts:157`, `parseBlob.ts:440`), and a pure `streakFrom(sortedKeys)` walk. D-16's two scalars are merge-on-close, never recomputed. |
| **N-DAILY-03** | Behaviour on device-clock changes is an explicit written policy; daily results never touch campaign or endless records | The policy is D-01 and needs a home: § Don't Hand-Roll recommends `docs/ops/DAILY-CHALLENGE.md` on the `docs/ops/ENDLESS-MODE.md` precedent. § The Local Calendar Date establishes exactly what "the clock" can and cannot do to the derivation — including the one case D-01 does **not** cover (§ Pitfall 5, Hermes's per-runtime timezone cache). SC-5 is held at the type level by `RecordRunEndArgs`; § Architecture Patterns shows the two lines that must change and the one wrong fix that would break it. |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md / AGENTS.md)

| Directive | Source | How this research complies |
|---|---|---|
| "Expo HAS CHANGED. Read the exact versioned docs at `https://docs.expo.dev/versions/v57.0.0/` before writing any code." | `AGENTS.md` (via `CLAUDE.md` `@AGENTS.md`) | The SDK 57 versioned index and the `expo-localization` SDK 57 page were fetched this session (2026-09-27). Findings in § Environment Availability. **No Expo API is recommended by this phase**, which is itself the SDK-57-checked answer, not an omission. |
| No package may be added without `npx expo install` | `12-UI-SPEC.md` § Registry Safety | **Zero packages are recommended.** § Package Legitimacy Audit is therefore a declared not-applicable, not a skipped section. |

Beyond the two prose files, the repository enforces machine-checked constraints that bind
this phase directly. These are lint rules, not conventions:

| Constraint | Source, read this session | Consequence for Phase 12 |
|---|---|---|
| `src/levelgen/**` may not read ambient input: *"N-GEN-01: no `Date.now()` in levelgen/ — ambient input breaks seed reproducibility."* | `eslint.config.js:113-118` | The date derivation **must not** live in `src/levelgen/`. |
| `src/core/**` may not read the wall clock: *"D-13: no `Date.now()` in core/"* | `eslint.config.js:67-71` | The date derivation **must not** live in `src/core/`. |
| Layer matrix — `runtime` may import only `{ 'core', 'runtime', 'render', 'vfx' }`; `app` may import `{ 'runtime', 'render', 'input', 'app', 'services', 'levelgen' }`; `services` may import `{ 'services', 'core', 'levelgen' }` | `eslint.config.js:257-324` (`boundaries/dependencies`) | `DailyResultOverlay` (in `src/runtime/overlays/`) **cannot import from `src/services/`** — it must take plain scalars as props. This is the same fact the UI-SPEC asserted for design reasons; here it is a compile-time rule. |
| `app/_components/PlayingHost.tsx` is the only file allowed both `services` and `levelgen` | same matrix | PlayingHost is the correct and only home for "derive key → generate board → write result". The UI-SPEC already assigns it there. |
| `experiments.reactCompiler: true` | `app.config.js:100-103` | `react-hooks/purity` forbids calling `new Date()` / `Date.now()` during render. Cited in-repo at `PlayingHost.tsx:360`: *"Seeded 0, not `Date.now()`: `react-hooks/purity` forbids an impure call during [render]"*. This is why the UI-SPEC's "`now` as an injected prop" is mandatory rather than stylistic. |

---

## Summary

**This phase is smaller than it looks, and the one genuinely open question turned out to
have a clean, provable answer.**

The task framing asked whether `Intl` is available on Hermes at Expo SDK 57, whether it is
full-ICU, whether it differs across platform and build type, and what the DST-safe
derivation is. All four were answered by **executing JavaScript inside the exact Hermes
build this repository ships** — the `hermes-ios-250829098.0.17-release.tar.gz` artifact
already resolved into `ios/Pods/`, whose macOS slice was linked against a small JSI harness
built this session. The answers:

1. **`Intl` *is* present** — on iOS, on Android, in debug and in release — but it is a
   *partial* ECMA-402 implementation (`Collator`, `DateTimeFormat`, `NumberFormat`,
   `getCanonicalLocales`, and nothing else) backed by the **platform's** locale data
   (Apple `NSDateFormatter`/`NSLocale` on iOS, Android ICU4J on Android), not by a bundled ICU.
2. **`Intl` must nonetheless not be used for the date key**, and the reason is not
   availability — it is correctness. The executed probe shows `toLocaleDateString()` on the
   same instant produces `27/9/2569` (Thai Buddhist era), `۱۴۰۵/۷/۵` (Persian Solar Hijri),
   `١٦ ربيع الآخر، ١٤٤٨ هـ` (Islamic Umm al-Qura) and `27/09/2026` depending only on the
   device locale. A key derived that way gives **different boards to different devices on
   the same day** — SC-1 fails outright. The plain-`Date` getters returned `2026-09-27` in
   all five locales.
3. **Plain `Date` with explicit local getters is sufficient, and it is DST-immune** when the
   next-midnight instant is built by *calendar arithmetic* rather than by adding 86 400 000 ms.
   Both real 2026 failure modes were reproduced under Hermes: a 23-hour day
   (America/Santiago, 2026-09-06) where `+24h` **skips a date entirely**, and a 25-hour day
   (America/Havana, 2026-11-01) where `+24h` **repeats the same date**. The calendar-arithmetic
   form gave the correct first instant of the local day in both, including where local
   midnight does not exist and where it occurs twice.
4. **Expo SDK 57 offers no sanctioned date API for this** and none is needed.
   `expo-localization` exists in SDK 57 and exposes `getCalendars()[0].timeZone`, but it is
   not installed, and D-04 makes timezone *identity* irrelevant. This phase adds no Expo
   module and no package.

One finding was **not** anticipated by the brief and is the single most plan-relevant thing
in this document: **Hermes resolves the device time zone once per runtime and caches it for
that runtime's lifetime.** A C-level control in the same process proved the cache is
Hermes's own, not libc's. DST rules *within* the cached zone are still applied correctly
per instant — so the countdown across a DST boundary is safe — but a device **timezone
change** mid-session is invisible to `Date` until the JS runtime is recreated. That is a
bounded, acceptable consequence under D-04, but it must be written into the N-DAILY-03
policy rather than discovered by a traveller. See § Pitfall 5.

Everything else in this phase is reuse. The generator, the v4 blob, the mode gate and the
world-request path are all shipped and were re-read this session to confirm the exact
extension points. Two of them are sharper than the CONTEXT recorded: `RecordRunEndArgs` has
**no `daily` arm yet** (adding it is a typed, compiler-forced change that is exactly how
SC-5 stays true), and `byMode.daily` is a `Partial<Record<string, …>>` whose sanitizer
copies **every key with no cap** — so keying it by date would create the one unbounded
collection D-15 exists to prevent.

**Primary recommendation:** Put two pure functions — `localDateKey(nowMs)` and
`nextLocalMidnightMs(nowMs)` — in a new `src/services/daily/` module, built from
`getFullYear()`/`getMonth()`/`getDate()` and the `new Date(y, m, d + 1, 0, 0, 0, 0)`
constructor; pass the resulting `YYYY-MM-DD` string straight to `generate(key, 10)`; use
`DAILY_TELEMETRY_KEY = 'daily'` (never the date) for `byMode.daily`; store the date history
as a new `TelemetryBlob.daily` record bounded on write *and* on read; and never let
`Intl`, `toLocale*`, or `toISOString()` touch the key.

---

## Architectural Responsibility Map

The five-tier web taxonomy does not apply to a local-first React Native game. The tiers
below are this repository's own, as declared in `eslint.config.js:225-240`
(`boundaries/elements`) and enforced by `boundaries/dependencies`.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Local-date derivation (`localDateKey`, `nextLocalMidnightMs`) | `services` (`src/services/daily/`) | — | It reads ambient input (the device clock), which `core` and `levelgen` both ban by lint. `services` is the only tier that may be imported by `app` *and* may import `levelgen` — exactly what the derivation's two consumers need. `src/services/endless/ramp.ts` is the shipped precedent for a pure per-mode policy module. |
| Streak computation over stored dates | `services` (`src/services/daily/streak.ts`) | — | Pure function of a sorted string array; no clock, no React, no storage handle. Testable with zero mocks. |
| Date-key validation on read-back | `services` (`src/services/storage/parseBlob.ts`) | — | It is blob sanitization, and every other sanitizer already lives there. ASVS V5 — see § Security Domain. |
| The daily result record + D-16's two scalars | `services` (`src/services/storage/`) | — | `TelemetryBlob.endless` + `mergeEndlessRecord` is the shape-for-shape analog, written by exactly one merge function. |
| Board generation from the key | `levelgen` | — | Unchanged. `generate(seed: number \| string, difficulty: number)` already takes the string. |
| Run orchestration: derive → generate → run → write → render | `app` (`app/_components/PlayingHost.tsx`) | — | The only tier permitted to import both `services` and `levelgen`. Owns the `__DEV__` entry, run boundaries and the `now` value it injects into the overlay. |
| `DailyResultOverlay` presentation | `runtime` (`src/runtime/overlays/`) | — | `runtime` **cannot** import `services` (layer matrix). It therefore takes plain scalars as props — which is also the UI-SPEC's "SC-5 at the prop signature" requirement, arrived at independently. |
| Mid-run board swap / world lifecycle | `runtime` (`src/runtime/worldRequests.ts`) | — | Deliberately mode-agnostic; `worldRequests.ts:56` says so in its own comment. Unchanged. |

---

## The Local Calendar Date on Hermes — the one real unknown

### How this was established

Everything in this section was **executed**, not recalled. Method:

1. The repository's iOS Pods tree already contains the resolved Hermes artifact:
   `ios/Pods/hermes-engine-artifacts/hermes-ios-250829098.0.17-release.tar.gz` (and a
   `-debug` sibling). `ios/Podfile.properties.json` declares `"expo.jsEngine": "hermes"`;
   `node_modules/react-native/sdks/.hermesversion` reads `hermes-v0.17.0`.
2. The artifact ships a macOS slice of the **same build** (`destroot/Library/Frameworks/macosx/hermesvm.framework`)
   plus the full `jsi/` + `hermes/` headers. A ~20-line C++ harness was compiled against it
   (`clang++ -std=c++20 -arch arm64 … -framework hermesvm`) that calls
   `facebook::hermes::makeHermesRuntime()` and `evaluateJavaScript()` on stdin.
3. The runtime self-reported `HermesInternal.getRuntimeProperties()["OSS Release Version"]`
   as **`"250829098.0.17"`** — byte-identical to the version in the iOS artifact filename,
   confirming the harness runs the build this repo ships rather than some other Hermes.

**What this method can and cannot show.** It executes the real SDK 57 Hermes VM with the
real Apple `PlatformIntl` backing (the iOS `hermesvm` binary links `Foundation`,
`CoreFoundation` and `libobjc`, and imports `_OBJC_CLASS_$_NSLocale`, `_OBJC_CLASS_$_NSCalendar`,
`_OBJC_CLASS_$_NSDateFormatter`, `_OBJC_CLASS_$_NSTimeZone` and `_CFLocaleCopyCurrent`). It
**cannot** show Android behaviour — the Android slice is a different compilation with a
Java/ICU4J Intl layer and bionic's tzdata. Android items are marked for device verification
in § Device Verification Items.

### Finding 1 — `Intl` exists, and it is partial

Executed under Hermes `250829098.0.17`:

```
typeof Intl = object
Object.getOwnPropertyNames(Intl) = getCanonicalLocales,Collator,DateTimeFormat,NumberFormat
typeof Intl.DateTimeFormat = function
new Intl.DateTimeFormat().resolvedOptions()
  = {"day":"numeric","year":"numeric","timeZone":"Asia/Manila","month":"numeric","locale":"en-US"}
```

`[VERIFIED: executed under hermes 250829098.0.17, this session]`

Absent, confirmed by the same `getOwnPropertyNames` enumeration and by a symbol scan of the
**ios-arm64** binary: `PluralRules`, `RelativeTimeFormat`, `ListFormat`, `Segmenter`,
`DisplayNames`, `DurationFormat`, `Intl.Locale` — all zero occurrences.
`[VERIFIED: strings/nm over ios-arm64 hermesvm, this session]`

`resolvedOptions()` returned **no `calendar` field**, which ECMA-402 requires. Do not rely
on `Intl` introspection to detect a non-Gregorian device calendar either.
`[VERIFIED: executed, this session]`

**Debug vs release, iOS:** the `-debug` artifact's ios-arm64 slice contains the identical
`Intl.DateTimeFormat.prototype.format` / `.formatToParts` / `.resolvedOptions` symbols. No
difference. `[VERIFIED: strings over both artifacts, this session]`

**Android:** built from source with Intl unconditionally enabled. Verbatim from
`node_modules/react-native/ReactAndroid/hermes-engine/build.gradle.kts:356-358`:

```
            // We intentionally build Hermes with Intl support only. This is to simplify
            // the build setup and to avoid overcomplicating the build-type matrix.
            "-DHERMES_ENABLE_INTL=True",
```

and line 420 adds `java.srcDirs("$hermesDir/lib/Platform/Intl/java", "$hermesDir/lib/Platform/Unicode/java")`
— i.e. the Android Intl is the Java/ICU4J implementation.
`[VERIFIED: node_modules/react-native/ReactAndroid/hermes-engine/build.gradle.kts:356-358,420]`

**So: "is Intl available" is not the blocker. The next finding is.**

### Finding 2 — `Intl` / `toLocale*` must NOT derive the date key

Same instant (`2026-09-27T12:00:00Z`), same runtime, varying only the device locale
(injected via the Apple `-AppleLocale` argument domain, which is what `NSLocale` reads):

| Device locale | `d.toLocaleDateString()` | plain-`Date` key |
|---|---|---|
| `th-TH` | `27/9/2569` | `2026-09-27` |
| `ar-SA` | `١٦ ربيع الآخر، ١٤٤٨ هـ` | `2026-09-27` |
| `fa-IR` | `۱۴۰۵/۷/۵` | `2026-09-27` |
| `ja-JP` | `2026/9/27` | `2026-09-27` |
| `en-GB` | `27/09/2026` | `2026-09-27` |

`[VERIFIED: executed under hermes 250829098.0.17, this session]`

Three different **calendar systems** (Buddhist, Islamic Umm al-Qura, Persian Solar Hijri)
and two non-ASCII digit systems. A key derived from `toLocaleDateString()` or from
`new Intl.DateTimeFormat().format()` would give a Thai device and a US device **different
seeds on the same day**, and therefore different boards — a direct SC-1 / N-DAILY-01 failure
that no amount of testing on an `en-US` simulator would ever surface.

Explicit-locale forms (`Intl.DateTimeFormat('en-CA')` → `2026-09-27`,
`{ calendar: 'gregory' }` → `2026-09-27`) do work under this Hermes, but they buy nothing
over the plain getters while adding a dependency on platform locale data that differs
between Apple's CFLocale and Android's ICU4J, and between OS versions.

**`Intl` is not needed at all. Do not introduce it.**

### Finding 3 — the derivation, and why it is DST-immune

```ts
/** The local calendar date of `nowMs`, as `YYYY-MM-DD`. */
export function localDateKey(nowMs: number): string {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** The first instant of the local calendar day AFTER the one containing `nowMs`. */
export function nextLocalMidnightMs(nowMs: number): number {
  const d = new Date(nowMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0).getTime();
}
```

`getFullYear()` / `getMonth()` / `getDate()` are defined by ECMA-262 over `LocalTime(t)` and
are always well defined for every instant — there is no instant with no local date, so there
is no DST hazard in the key itself. The `Date(y, m, d, …)` constructor interprets its fields
as **local** wall time, which is what makes `nextLocalMidnightMs` calendar arithmetic rather
than duration arithmetic. `String.prototype.padStart` is present in this Hermes build.
`[VERIFIED: executed, this session]`

The two hazard cases, both **real and live in the 2026 tz database** (confirmed with
`zdump -v`), reproduced under Hermes:

**(a) Local midnight that does not exist — America/Santiago, 2026-09-06.**
`zdump` shows `Sat Sep 5 23:59:59 -04` → `Sun Sep 6 01:00:00 -03`. Sunday has no 00:00–00:59.

```
justBefore  = Sat Sep 05 2026 23:59:59 GMT-0400   key=2026-09-05  tzOff=240
justAfter   = Sun Sep 06 2026 01:00:00 GMT-0300   key=2026-09-06  tzOff=180
new Date(2026,8,6,0,0,0,0)        -> 2026-09-06T04:00:00.000Z = Sun Sep 06 2026 01:00:00 GMT-0300
nextLocalMidnight(from justBefore) -> 2026-09-06T04:00:00.000Z, remainingMs = 1000
```

The constructor resolved a non-existent local time to **the first instant that does exist on
that local day** — no `NaN`, no fall-back to the previous day — and the countdown from the
last second of Saturday correctly read 1 000 ms. `[VERIFIED: executed, this session]`

**(b) Local midnight that occurs twice, and a 25-hour day — America/Havana, 2026-11-01.**
`zdump` shows `Sun Nov 1 00:59:59 CDT` → `Sun Nov 1 00:00:00 CST`.

```
firstMidnight  = Sun Nov 01 2026 00:00:00 GMT-0400   key=2026-11-01
secondMidnight = Sun Nov 01 2026 00:00:00 GMT-0500   key=2026-11-01
new Date(2026,10,1,0,0,0,0) -> 2026-11-01T04:00:00.000Z  (the FIRST occurrence)
dayLengthMs(2026-11-01) = 90000000        (25 hours, not 86400000)
countdown at 00:00 on that day = 25h 0m
```

`[VERIFIED: executed, this session]`

**(c) The trap the contract already forbids, now with evidence.** `now + 86_400_000`:

| Zone / instant | key(now) | key(now + 86 400 000) | Failure |
|---|---|---|---|
| Santiago, Sat 2026-09-05 23:59:59 local | `2026-09-05` | `2026-09-07` | **skips 2026-09-06 entirely** — a whole daily board is never reachable |
| Havana, Sun 2026-11-01 00:30 local | `2026-11-01` | `2026-11-01` | **repeats the same date** — "tomorrow's board" is today's |

`[VERIFIED: executed, this session]` This is the hard evidence behind `12-UI-SPEC.md`
§ Clock policy rule 3 ("`nextLocalMidnight` is calendar arithmetic, not `now + 86_400_000`").

**(d) Rollovers.** `getDate() + 1` overflowing the month is handled by the constructor:
year rollover `2026-12-31 → 2027-01-01`; leap `2028-02-28 → 2028-02-29`; non-leap
`2027-02-28 → 2027-03-01`; month `2026-09-30 → 2026-10-01`. All correct.
`[VERIFIED: executed, this session]`

**(e) `toISOString().slice(0, 10)` is the wrong key** and fails silently for a third of every
day: at Santiago local `Sun Sep 27 2026 21:00:00 GMT-0300` the local key is `2026-09-27`
while `toISOString().slice(0,10)` is `2026-09-28`. `[VERIFIED: executed, this session]`

### Finding 4 — Hermes caches the device time zone per runtime

This was not in the brief and is the most consequential result.

A single `HermesRuntime` was asked for `new Date(1790000000000).toString()` three times,
with `setenv("TZ", …)` + `tzset()` between calls, interleaved with a **C control** calling
`localtime_r` on the same instant in the same process:

```
   [C control Manila]   localtime_r -> 2026-09-21 22:13 PST
1) Hermes @Manila       -> Mon Sep 21 2026 22:13:20 GMT+0800
   [C control Santiago] localtime_r -> 2026-09-21 11:13 -03
2) Hermes same runtime  -> Mon Sep 21 2026 22:13:20 GMT+0800     <-- stale
3) Hermes NEW runtime   -> Mon Sep 21 2026 11:13:20 GMT-0300     <-- picks it up
```

`[VERIFIED: executed under hermes 250829098.0.17, this session]`

The C control proves the cache is **Hermes's own**, not libc's: `localtime_r` in the same
process saw the new zone immediately while Hermes's `Date` did not. A freshly constructed
runtime did see it, so the cache is per-runtime, not process-global. The Foundation-backed
`Intl` caches even harder — `resolvedOptions().timeZone` still reported `Asia/Manila` even
in the fresh runtime.

**What is *not* broken by this.** Hermes caches the **zone**, not an offset: within one
runtime it returned `GMT-0400` and `GMT-0300` for two instants either side of the Santiago
transition, and computed a 25-hour Havana day. So:

- **DST transitions while the app is alive are handled correctly.** The countdown across a
  local DST boundary is safe. UI-SPEC § Clock policy rule 3 holds.
- **Device *clock* changes are unaffected.** `Date.now()` reads the wall clock on every
  call; only the zone is cached. D-02 and D-03 are untouched.

**What is broken by it.** A device **timezone** change mid-session (air travel, or the user
toggling the OS setting) is invisible to `Date` until the JS runtime is recreated — app kill
and relaunch, or a dev reload. So the derived local date, and therefore which board is
"today", stays on the *departure* zone for the remainder of the session. See § Pitfall 5 for
the bounded consequence and the recommended one-sentence addition to the N-DAILY-03 policy.

### Finding 5 — this is testable in the existing suite, with Node agreeing with Hermes

Node 25.6.0 (the project's runtime; `package.json` `engines.node` is `">=24 <25"` — note the
mismatch, § Environment Availability) reproduced Hermes's answers **exactly** on both hazard
cases: `new Date(2026,8,6,0,0,0,0).toISOString() === '2026-09-06T04:00:00.000Z'` and the
Havana day length of `90000000`. `[VERIFIED: executed, this session]`

And `process.env.TZ` reassigned **inside a running test** is honoured. A throwaway spec was
run through the project's own `npx vitest run` and then deleted; the repository is unchanged
(`git status` clean apart from the pre-existing `.planning/` edits):

```
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

covering (i) TZ reassignment mid-test, (ii) the Santiago skipped midnight, (iii) the Havana
25-hour day. `[VERIFIED: npx vitest run, this session]`

**Consequence for the plan:** the DST behaviour is `explicit`-testable, not `backstop`. The
residual unknowns shrink to two Android-only items and one real-device rollover — all listed
under § Device Verification Items.

### Seed diffusion — 731 consecutive date keys

`hashSeed` is FNV-1a over `charCodeAt` (`src/levelgen/rng.ts:87-97`), `mixSeed` folds in
difficulty, and `makeRng` is mulberry32. Replaying those exact three functions over 731
consecutive ISO keys starting `2026-01-01`, at a fixed difficulty:

```
dates: 731   distinct hashSeed: 731   distinct mixSeed(d=10): 731
distinct 8-draw signatures: 731
consecutive-date mixSeed hamming: mean 17.18  min 7  max 24   (ideal mean 16)
distinct low-8-bits of first draw across 731 dates: 244/256
```

`[VERIFIED: node replay of src/levelgen/rng.ts:87-108, this session]` No collision and no
adjacent-date correlation. A one-character difference between consecutive keys is fully
diffused before it reaches the board. No extra hashing step is needed or wanted.

---

## Standard Stack

### Core

**None added.** Every capability this phase needs is already in the repository.

| Component | Version | Purpose | Why standard |
|---|---|---|---|
| ECMAScript `Date` (Hermes built-in) | Hermes `250829098.0.17` (`hermes-v0.17.0`) | Local calendar date + next-local-midnight | Present, locale-invariant, calendar-invariant, DST-correct — all four proven by execution above. Nothing else in the ecosystem is more available. |
| `generate(seed: number \| string, difficulty: number)` | in-repo, `src/levelgen/generate.ts:223` | Date-key → board | Already accepts a string seed; Phase 10 proved determinism; `rng.ts:82-84` says in-source that the string arm exists *for Phase 12*. |
| `ProgressStore` v4 blob | in-repo, `PROGRESS_KEY = '@nbb/progress/v4'` (`types.ts:21`) | Daily result + D-16 scalars | Phase 9 D-04 reserved `daily` here specifically for this phase. |
| `vitest` | `5.0.1` (`package.json` devDependencies) | Test runner | Already the project's runner; TZ pinning verified working in it this session. |

### Supporting

| Component | Version | Purpose | When to use |
|---|---|---|---|
| `src/services/endless/ramp.ts` | in-repo | Structural template | Copy its *shape* for `src/services/daily/` — pure integer functions, a doc header stating what is contract and what is borrowed, a dedicated `tests/daily.*.test.ts` guard. |
| `docs/ops/ENDLESS-MODE.md` | in-repo | Doc template | N-DAILY-03 demands a written policy; this is the shipped precedent for a per-mode ops doc. |

### Alternatives Considered

| Instead of | Could use | Tradeoff |
|---|---|---|
| Plain `Date` local getters | `Intl.DateTimeFormat('en-CA')` or `{ calendar: 'gregory' }` | Works under this Hermes, but adds a dependency on platform locale data that differs between Apple CFLocale and Android ICU4J and across OS versions, for output the plain getters already produce. **Rejected.** |
| Plain `Date` local getters | `toLocaleDateString()` / `Intl.DateTimeFormat()` with the device locale | **Rejected — breaks SC-1.** Produces Buddhist / Islamic / Persian calendar strings depending on device locale; evidence in Finding 2. |
| Plain `Date` local getters | `toISOString().slice(0, 10)` | **Rejected — wrong by construction.** It is the *UTC* date; wrong for roughly a third of every day in any non-UTC zone. Evidence in Finding 3(e). |
| Plain `Date` local getters | `expo-localization` `getCalendars()[0].timeZone` + manual zone math | Would require a full tz-offset implementation this phase does not need. Its one genuine advantage — it reads the OS zone natively and so is **not** subject to Hermes's per-runtime cache — is only useful if the phase chose to handle mid-session timezone travel, which D-04 declines. **Rejected, but named** because it is the mitigation if that decision is ever revisited. |
| `new Date(y, m, d + 1, 0,0,0,0)` | `now + 86_400_000` | **Rejected — proven wrong.** Skips a date on a 23h day and repeats one on a 25h day; evidence in Finding 3(c). |
| `new Date(y, m, d + 1, 0,0,0,0)` | `d.setHours(0,0,0,0)` then `+1 day` | Equivalent on the probed cases (identical instant on the Santiago skipped midnight), but it mutates and reads worse. Either is correct; prefer the constructor. |

**Installation:**

```bash
# none — this phase adds no package
```

---

## Package Legitimacy Audit

**Not applicable — this phase installs no external package.**

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---|---|---|---|---|---|---|
| *(none)* | — | — | — | — | — | — |

**Packages removed due to `[SLOP]` verdict:** none — none were proposed.
**Packages flagged as suspicious `[SUS]`:** none — none were proposed.

The one package a naive reading of this phase might reach for is `expo-localization`. It is
a first-party Expo module and it genuinely exists in SDK 57 `[CITED: https://docs.expo.dev/versions/v57.0.0/sdk/localization/]`,
but § Standard Stack rejects it on grounds of need, not legitimacy. If a plan proposes it,
the project rule stands: `npx expo install expo-localization`, never bare `npm install`.

---

## Architecture Patterns

### System Architecture Diagram

```
                      device wall clock (Date.now())
                                 │
                                 │  nowMs  (read in an effect / callback —
                                 │          NEVER during render: reactCompiler
                                 ▼          purity, PlayingHost.tsx:360)
         ┌───────────────────────────────────────────────┐
         │  src/services/daily/dateKey.ts   [pure]       │
         │   localDateKey(nowMs)      -> "YYYY-MM-DD"    │
         │   nextLocalMidnightMs(nowMs) -> number        │
         └───────┬───────────────────────────┬───────────┘
                 │ dateKey                   │ nextLocalMidnightMs
                 │                           │
     ┌───────────▼─────────────┐             │
     │  READ: does this date   │             │
     │  already have a result? │◄────────────┼──── ProgressStore.getSnapshot()
     │  (D-01 — the WHOLE      │             │      telemetry.daily.history
     │   clock policy)         │             │
     └─────┬─────────────┬─────┘             │
           │ no          │ yes               │
           │ (OPEN)      │ (CLOSED)          │
           ▼             ▼                   │
  ┌──────────────┐   ┌──────────────────┐    │
  │ generate(    │   │ read stored      │    │
  │  dateKey,    │   │ result for the   │    │
  │  DAILY_DIFF) │   │ date; DO NOT     │    │
  │  [levelgen]  │   │ generate a board │    │
  └──────┬───────┘   └────────┬─────────┘    │
         │ LevelFileV1        │              │
         ▼                    │              │
  ┌──────────────────┐        │              │
  │ campaign-shaped  │        │              │
  │ run (D-10)       │        │              │
  │ worldRequests —  │        │              │
  │ reused verbatim  │        │              │
  └──────┬───────────┘        │              │
         │ win | lose         │              │
         ▼                    │              │
  ┌───────────────────────────▼───────────┐  │
  │ WRITE FIRST, then render (UI-SPEC):   │  │
  │  recordRunEnd({ mode:'daily', … })    │  │
  │    -> byMode.daily[DAILY_TELEMETRY_KEY]│ │
  │  mergeDailyRecord(telemetry, {date,…})│  │
  │    -> telemetry.daily.history (bounded)│ │
  │    -> longestStreak, totalDaysPlayed  │  │
  │  ── never touches bestByLevel /       │  │
  │     unlocked / bestScore / endless    │  │
  └──────┬────────────────────────────────┘  │
         │ stored record                     │
         ▼                                   │
  ┌──────────────────────────────┐           │
  │ streakFrom(sortedDateKeys)   │  [pure]   │
  │  -> current, endedLength?    │           │
  └──────┬───────────────────────┘           │
         │                                   │
         ▼                                   ▼
  ┌────────────────────────────────────────────────────┐
  │ DailyResultOverlay  [src/runtime — plain props ONLY]│
  │  scalars in, no store handle, `now` injected        │
  │  countdown = nextLocalMidnightMs(now) − now         │
  │  refresh: mount · AppState→active · 60s interval    │
  └────────────────────────────────────────────────────┘
```

Two arrows are deliberately absent, and their absence is contract: there is **no** arrow from
any daily box to `bestByLevel` / `unlocked` / `bestScore` / `telemetry.endless` (SC-5), and
**no** arrow from the countdown back into the playability decision (UI-SPEC § Clock policy
rule 1 — the countdown is decoration and never a gate).

### Recommended Project Structure

```
src/services/daily/          # NEW — pure policy, the src/services/endless/ precedent
├── index.ts                 # barrel
├── dateKey.ts               # localDateKey, nextLocalMidnightMs, isValidDateKey, DAILY_DIFFICULTY
└── streak.ts                # streakFrom(sortedKeys), endedStreakLength(sortedKeys, date)

src/services/storage/
├── types.ts                 # + DailyRecord, DAILY_TELEMETRY_KEY, DAILY_HISTORY_BOUND,
│                            #   RecordRunEndArgs 'daily' arm, TelemetryBlob.daily
├── telemetry.ts             # + mergeDailyRecord  (mirror of mergeEndlessRecord)
├── parseBlob.ts             # + sanitizeDailyRecord (bound + date-key validation on read)
├── memoryStore.ts           # telemetryKey line  (see § Pitfall 1)
└── asyncStorageStore.ts     # telemetryKey line  (see § Pitfall 1)

src/runtime/overlays/
└── DailyResultOverlay.tsx   # NEW — plain scalar props, per 12-UI-SPEC

app/_components/
└── PlayingHost.tsx          # daily mode branch, __DEV__ `Daily` control, run boundaries

docs/ops/
└── DAILY-CHALLENGE.md       # NEW — N-DAILY-03's written policy
```

### Pattern 1: Read the clock once per decision, at the edge

**What:** Every consumer takes `nowMs: number`. Only `PlayingHost` (and the overlay's
refresh effect) ever calls `Date.now()`, and never during render.

**When to use:** Every function in `src/services/daily/`.

**Why:** three separate forces converge on the same rule — `reactCompiler`'s
`react-hooks/purity` (cited in-repo at `PlayingHost.tsx:360`), the UI-SPEC's
"`now` as an injected value, never calling `Date.now()` inside its own render", and
testability (the 23h/25h/sub-minute cases are only pinnable with an injected clock).

```ts
// src/services/daily/dateKey.ts
export function localDateKey(nowMs: number): string { /* … */ }
export function nextLocalMidnightMs(nowMs: number): number { /* … */ }
```

### Pattern 2: Bound on write AND on read

**What:** Trim the daily history to `DAILY_HISTORY_BOUND` where it is written, and trim it
again where it is parsed.

**Why:** this is the shipped precedent, verbatim from the repository:

```ts
// src/services/storage/telemetry.ts:157
  next.recentRuns = [...next.recentRuns, entry].slice(-RECENT_RUNS_BOUND);
```

```ts
// src/services/storage/parseBlob.ts (sanitizeTelemetry)
    // Bound on read as well as on write — a tampered blob cannot grow the ring.
    out.recentRuns = entries.slice(-RECENT_RUNS_BOUND);
```

D-15 names the write-time bound. The read-time bound is what makes it hold against a blob
that was written by an older build or edited on a rooted device.

### Pattern 3: Let the discriminated union force the mode gate

`RecordRunEndArgs` currently has exactly two arms, and its own doc comment states the
intent, verbatim (`src/services/storage/types.ts:275-277`):

```
 * Phase 12 adds the `daily` arm when daily runs exist. Until then `daily` is
 * deliberately excluded rather than silently treated as campaign.
```

Adding the arm is a **compiler-forced** change, which is the whole SC-5 mechanism. Both
stores carry the identical gate comment (`memoryStore.ts:96-99`, `asyncStorageStore.ts:376-379`):

```
      // Campaign progress is mode-gated (SC-3 / N-END-02): an endless or daily
      // run must never move bestByLevel, bestScore or the unlock ladder. The
      // discriminated union makes args.levelId reachable ONLY inside this block,
      // so the gate cannot be dropped without a compile error.
```

The daily arm must carry `date` and `score` and **no `levelId`** — the absence is what makes
the campaign write unreachable, exactly as the endless arm's absence does.

### Pattern 4: `mergeDailyRecord` mirrors `mergeEndlessRecord`

One merge function owns the daily record, as one owns the endless one
(`src/services/storage/telemetry.ts`):

```ts
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

`mergeDailyRecord` takes `{ date, score, outcome }`, appends to the bounded history **only
if the date is not already present** (D-06's once-per-date, enforced at the merge rather than
trusted to the caller), and raises `longestStreak` / `totalDaysPlayed` — the D-16 scalars,
which are *raised on close*, never recomputed from the trimmed window.

### Pattern 5: The overlay is a leaf with scalar props

`boundaries/dependencies` gives `runtime` access only to `{ core, runtime, render, vfx }`.
`DailyResultOverlay` therefore cannot import `DailyRecord` from `src/services/storage`. Give
it `dateKey: string`, `score: number`, `outcome: 'win' | 'lose'`, `streak: number`,
`longestStreak: number`, `totalDaysPlayed: number`, `endedStreakLength: number | null`,
`nowMs: number`, `nextMidnightMs: number`, `onMenu`, plus the board-failure variant flag.
This is the UI-SPEC's "SC-5 at the prop signature, where it is checkable by reading the type"
— and it is also the only shape the lint allows.

### Anti-Patterns to Avoid

- **Re-minting a seed on `Retry`.** `startEndlessRun` does `runSeedRef.current = Date.now() >>> 0`
  (`PlayingHost.tsx:1375`) — correct for endless, an outright SC-1 break in daily. The daily
  seed is the date key and nothing else.
- **Taking Phase 11's `WON` wave-advance intercept.** A cleared daily board ends the run
  (D-10). Named in the UI-SPEC; repeated here because the branch is adjacent in the same file.
- **Keying `byMode.daily` by the date.** See § Pitfall 1 — it creates an unbounded map.
- **Widening `ResultOverlay`'s `mode` prop.** UI-SPEC § A new component. Ship
  `DailyResultOverlay` separately.
- **A second representation of the date.** The UI-SPEC requires the panel render the stored
  key verbatim. Any `format(date)` step introduces a value that can disagree with the key the
  board was derived from, which is precisely what SC-1 claims cannot happen.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| Local calendar date | A timezone-offset table, a `getTimezoneOffset()`-and-subtract scheme, or any zone arithmetic | `new Date(ms).getFullYear()/.getMonth()/.getDate()` | ECMA-262 already defines it over `LocalTime(t)`; it is total (every instant has a local date) and the engine owns the tz database. Offset arithmetic re-derives what the engine already knows and gets DST days wrong. |
| "Start of tomorrow, locally" | `now + 86_400_000`, or `startOfDay + 86_400_000` | `new Date(y, m, d + 1, 0, 0, 0, 0)` | Proven wrong in both directions by executed probe: skips a date on a 23h day, repeats one on a 25h day. |
| Zero-padding a date | A locale/`Intl` format, or a hand-rolled `if (m < 10)` chain | `String(n).padStart(2, '0')` | Present in this Hermes build (verified). The locale route is the SC-1 break in Finding 2. |
| A date-string parser | `new Date("2026-09-27")` to compare or validate keys | Integer arithmetic over the three `YYYY-MM-DD` fields | `new Date(string)` is implementation-defined for anything but the exact ISO forms, and the ISO date-only form parses as **UTC**, re-introducing the Finding 3(e) bug. The keys sort lexicographically, so `<`, `>`, `===` are all you need for D-14's walk. |
| "Is the previous key exactly one day earlier?" | A `Date` round trip per comparison | `new Date(y, m - 1, d - 1)` → `localDateKey` once, compared to the candidate | One constructor call, handles month/year/leap rollover (verified in Finding 3(d)), and is immune to the 23h/25h day because it is calendar arithmetic. |
| A monotonic clock / anti-rollback watermark | Any "highest date seen" field | Nothing — D-05 rejects it | Named here so a plan does not reinvent it. |
| The written clock policy | Prose scattered in code comments | `docs/ops/DAILY-CHALLENGE.md`, on the `docs/ops/ENDLESS-MODE.md` precedent | N-DAILY-03 asks for *an explicit written policy*. `docs/ops/` is where this project puts them, and `ENDLESS-MODE.md` shows the expected shape. |
| Bounded-collection logic | A custom ring buffer | `.slice(-BOUND)` at the write site, repeated at the parse site | The shipped pattern; two lines, no state. |

**Key insight:** every hand-rolled alternative in this table fails the *same* way — it
re-derives, from ambient data, something the engine has already computed correctly, and it
fails only in the ~4 hours per year and ~5 % of time zones where a calendar day is not 24
hours. That is exactly the failure profile that ships green and breaks a streak six months
later, with no reproduction case.

---

## Common Pitfalls

### Pitfall 1: Keying `byMode.daily` by the date — the unbounded map

**What goes wrong:** `byMode.daily` grows one entry per date played, forever, in a blob that
is read whole on every app open.

**Why it happens:** the two stores contain this line (`memoryStore.ts:119`,
`asyncStorageStore.ts:402`), verbatim:

```ts
      const telemetryKey =
        args.mode === 'endless' ? ENDLESS_TELEMETRY_KEY : args.levelId;
```

Adding a `daily` arm with no `levelId` makes this line **stop compiling** — which is the
system working. But the smallest edit that makes it compile again is
`args.mode === 'campaign' ? args.levelId : args.date`, and that is the bug. The blob's own
sanitizer will faithfully preserve every key forever (`parseBlob.ts`, `sanitizeAggregateMap`):

```ts
  const map = raw as Record<string, unknown>;
  for (const key of Object.keys(map)) {
    const entry = map[key];
    if (entry == null || typeof entry !== 'object') {
      continue;
    }
    out[key] = sanitizeAggregate(entry);
  }
```

— no key cap anywhere. `[VERIFIED: src/services/storage/parseBlob.ts, sanitizeAggregateMap]`

**How to avoid:** add `export const DAILY_TELEMETRY_KEY = 'daily' as const;` beside the
shipped `export const ENDLESS_TELEMETRY_KEY = 'endless' as const;` (`types.ts:145`) and write
the line as a three-way switch on mode that never reaches a date. The per-date history belongs
in the new bounded `telemetry.daily.history`, **not** in `byMode`.

**Warning signs:** a test that asserts `byMode.daily[someDateKey]`; a grep for `byMode.daily`
returning a variable subscript.

### Pitfall 2: Two different things both called `daily`

**What goes wrong:** `TelemetryBlob` will have both `byMode.daily` (lifetime aggregate
counters, D-09) and — if the recommended shape is taken — `daily` (the per-date result record,
D-15/D-16). `telemetry.daily` and `telemetry.byMode.daily` are one character apart and mean
entirely different things.

**Why it happens:** it is the exact shape that already exists for endless:
`TelemetryBlob.endless` (an `EndlessRecord`) sits beside `TelemetryBlob.byMode.endless` (an
aggregate map). Verbatim from `types.ts:147-157`:

```ts
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

**How to avoid:** follow the precedent (consistency beats novelty here) but carry the
`endless` field's own doc-comment discipline: `/** Daily per-date history + D-16 scalars — written only by 'mergeDailyRecord'. */`.
A plan may instead name the record `dailyRecord`; either is defensible, but it must be
**decided**, not left to whichever file is edited first.

### Pitfall 3: `Retry` during a live daily run re-minting the board

Covered in § Anti-Patterns; repeated in this list because it is the single highest-severity
SC-1 break available in this phase and the offending line (`PlayingHost.tsx:1375`) is a few
hundred lines from where the daily branch will be written.

**Warning signs:** any `Date.now()` on a daily code path other than "what is the current
instant" for the key and the countdown.

### Pitfall 4: Deriving the key during render

**What goes wrong:** `reactCompiler` is on (`app.config.js:100-103`) and `react-hooks/purity`
fails the build on an impure call during render. The repo already hit this, verbatim at
`PlayingHost.tsx:360`: *"Seeded 0, not `Date.now()`: `react-hooks/purity` forbids an impure
call during"* render.

**How to avoid:** derive `nowMs` in an effect, a callback or an event handler, and thread it
down as a prop. The UI-SPEC already mandates this for the overlay; it applies equally to the
`__DEV__` `Daily` press handler and the D-01 playability check.

### Pitfall 5: Timezone travel mid-session (Hermes's per-runtime zone cache)

**What goes wrong:** a player flies from Manila to Santiago, foregrounds the app without
killing it. The OS has changed zone; Hermes's `Date` has not (Finding 4). Every subsequent
`localDateKey(Date.now())` is computed in the *departure* zone.

**Concretely:** for up to ~14 hours of offset difference, "today" per the app and "today"
per the device can be different calendar dates. Under D-01 that is bounded but real: the
player may find today already closed (if the departure zone is ahead) or may play a date
the device thinks is tomorrow (if behind). Neither corrupts anything — D-01 reads only the
stored set — and after an app relaunch the derivation is correct again.

**How to avoid:** do **not** add a special case. D-04 already says timezone travel is not
distinguished from clock tampering, and adding mitigation would contradict it. What the
phase **must** do is write the consequence into `docs/ops/DAILY-CHALLENGE.md` as one
sentence, e.g.:

> *A device timezone change is not observed until the app is relaunched, because the JS
> engine resolves the local zone once per runtime. D-01 covers the outcome: whichever local
> date the app derives, it is playable iff it has no stored result.*

**Warning signs:** a plan proposing an `AppState`-active timezone re-check, or importing
`expo-localization` "just to be safe" — that is a real mitigation (the native call is not
subject to the cache) but it is a decision D-04 already declined.

**Not verified on device** — see § Device Verification Items, item 2.

### Pitfall 6: The countdown can legitimately read `24h` or `25h`

**What goes wrong:** a reviewer sees `New board in 25h 0m` and files a bug.

**Why it happens:** it is correct. The Havana probe measured a local day of exactly
`90 000 000 ms`, and at its first instant `nextLocalMidnight − now` is 25 hours. The
UI-SPEC's own reasoning for flooring (*"at 23h 59m 30s remaining, a ceiling would print
`24h 0m`, which is longer than a day and reads as a bug"*) assumes a 24-hour day, which is
what rule 3 of the same section explicitly says is not always true.

**How to avoid:** do not clamp, do not special-case. Ensure `{h}` is formatted as a plain
integer with no two-character assumption, and add the 25-hour case to the countdown test so
a later reader finds a pinned expectation rather than a suspicion. Reachable for one hour
per year per affected zone — a rare, correct, surprising output is exactly the kind that gets
"fixed" into a wrong one.

### Pitfall 7: There is no `AppState → active` hook to attach the refresh to

**What goes wrong:** the UI-SPEC requires the countdown refresh "on every `AppState` → `active`"
and the date key be re-derived "on every foreground". The shipped helper has no such callback.
Verbatim, `src/runtime/appStatePause.ts`:

```ts
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

**How to avoid:** either add an **optional** `onForeground?: () => void` to this helper —
keeping the `// active: intentionally empty — never auto-resume (D-15)` invariant by calling
only the new callback and nothing physics-related — or have `DailyResultOverlay`'s host own
its own `AppState.addEventListener`. The first is tidier and keeps one subscription; the
second avoids touching a file whose comment explicitly guards against exactly this edit.
**Either way this is a task, not an assumption.** A plan that says "refresh on foreground"
without naming which of the two, will produce a silent no-op.

### Pitfall 8: A tampered or legacy blob supplying a non-date `date` field

**What goes wrong:** the UI-SPEC requires the panel render the stored key verbatim with no
formatting step. `sanitizeAggregateMap` demonstrates that the existing sanitizers preserve
arbitrary string keys. A blob containing `"date": "<4000 characters>"` would be rendered into
a `Text` inside a 320px panel.

**How to avoid:** validate the key on read with pure integer arithmetic (regex for
`^\d{4}-\d{2}-\d{2}$`, then a days-in-month check including the leap rule) and drop any entry
that fails — degrading to "this date has no stored result", which is the *playable*
direction and matches the UI-SPEC's already-accepted read-failure cost. Do **not** validate by
round-tripping through `new Date(string)`; see § Don't Hand-Roll. ASVS V5 — § Security Domain.

---

## Code Examples

All examples below are the *recommended shape*, written against APIs verified in this
session. They are not copied from an external source; the external-source claims they rest on
(Hermes `Date` semantics, `padStart` availability, constructor rollover) are the executed
probes in § The Local Calendar Date.

### Deriving the key and the next boundary

```ts
// src/services/daily/dateKey.ts
//
// Pure in `nowMs`. No Intl, no toLocale*, no toISOString — each of those leaks a
// locale, a calendar system or UTC into a value that SC-1 requires be identical on
// every device for a given local date. Evidence: 12-RESEARCH.md § Finding 2, 3(e).

/** The local calendar date of `nowMs`, as ISO-8601 `YYYY-MM-DD`. */
export function localDateKey(nowMs: number): string {
  const d = new Date(nowMs);
  const y = String(d.getFullYear()).padStart(4, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * The first instant of the local calendar day AFTER the one containing `nowMs`.
 *
 * Calendar arithmetic, NOT `nowMs + 86_400_000`. On a 23-hour local day the latter
 * skips a date outright and on a 25-hour day it repeats one — both measured under
 * Hermes 250829098.0.17 (America/Santiago 2026-09-06, America/Havana 2026-11-01).
 *
 * The `Date(y, m, d, …)` constructor reads its fields as LOCAL wall time, so this
 * is well defined even where local midnight does not exist (it resolves to the
 * first instant that does) or occurs twice (it takes the first).
 */
export function nextLocalMidnightMs(nowMs: number): number {
  const d = new Date(nowMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0).getTime();
}

/** The local calendar date exactly one day before `key`. Pure string → string. */
export function previousDateKey(key: string): string {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7));
  const d = Number(key.slice(8, 10));
  // Noon, not midnight: the field we mutate is the day, and a midday anchor cannot
  // land on a skipped local hour on either side of the step.
  return localDateKey(new Date(y, m - 1, d - 1, 12, 0, 0, 0).getTime());
}
```

### Validating a key read back from storage (no `Date` parsing)

```ts
// src/services/daily/dateKey.ts (continued)
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Days in a Gregorian month, integer-only (no Math.pow, no Date round trip). */
function daysInMonth(y: number, m: number): number {
  if (m === 2) {
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    return leap ? 29 : 28;
  }
  return m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 31;
}

export function isValidDateKey(raw: unknown): raw is string {
  if (typeof raw !== 'string' || !DATE_KEY_RE.test(raw)) return false;
  const y = Number(raw.slice(0, 4));
  const m = Number(raw.slice(5, 7));
  const d = Number(raw.slice(8, 10));
  if (m < 1 || m > 12) return false;
  return d >= 1 && d <= daysInMonth(y, m);
}
```

### The streak walk (D-13 / D-14 / D-17)

```ts
// src/services/daily/streak.ts — pure over a lexicographically sorted key array.
// ISO keys sort chronologically, which is the whole reason the key format is ISO.

/** Count of consecutive stored dates ending at `sorted[sorted.length - 1]`. */
export function streakFrom(sorted: readonly string[]): number {
  if (sorted.length === 0) return 0;
  let n = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    if (sorted[i - 1] !== previousDateKey(sorted[i]!)) break;
    n++;
  }
  return n;
}

/**
 * D-17's `endedLength`, or null when the line must be omitted.
 *
 * Returns null when the backward walk reaches the oldest key still in the trimmed
 * window while STILL consecutive: the true length is then unknown. Never substitute
 * `longestStreak` — 12-UI-SPEC § The streak-ended line is explicit that a confident
 * wrong number is worse than a silent omission.
 */
export function endedStreakLength(
  sortedWindow: readonly string[],
  date: string,
): number | null {
  const before = sortedWindow.filter((k) => k < date);
  if (before.length === 0) return null;                    // first date ever
  const prev = before[before.length - 1]!;
  if (prev === previousDateKey(date)) return null;         // streak continued
  let n = 1;
  for (let i = before.length - 1; i > 0; i--) {
    if (before[i - 1] !== previousDateKey(before[i]!)) break;
    n++;
    if (i - 1 === 0) return null;                          // hit the window floor
  }
  if (before.length === n) return null;                    // walked the whole window
  return n >= 2 ? n : null;                                // the ≥ 2 floor (UI-SPEC)
}
```

### The generate call

```ts
// app/_components/PlayingHost.tsx — the daily branch
import { generate } from '../../src/levelgen';
import { localDateKey, DAILY_DIFFICULTY } from '../../src/services/daily';

const dateKey = localDateKey(Date.now());            // in a callback, never in render
const level = generate(dateKey, DAILY_DIFFICULTY);   // string seed, no hashing step
```

`generate`'s own header (`src/levelgen/generate.ts:219-228`) already anticipates this:
*"Phase 12 feeds a date-derived value; an unclamped index would read past the table (T-10-09)"*
— it clamps difficulty itself, so `DAILY_DIFFICULTY` cannot escape `0..D_MAX` even if
mis-set.

---

## Inherited Constraints (settled — do not re-derive)

Stated so a plan can cite them, with the source line read this session.

| Constraint | Verbatim / citation |
|---|---|
| Generator signature | `export function generate(seed: number \| string, difficulty: number): LevelFileV1` `[VERIFIED: src/levelgen/generate.ts:223]` |
| String seeds exist *for this phase* | *"`generate` accepts `number \| string` so Phase 12 can pass a date string without a signature change."* `[VERIFIED: src/levelgen/rng.ts:82-84]` |
| Difficulty range | `export const D_MAX = 20;` `[VERIFIED: src/levelgen/schedule.ts:65]` |
| Mode set | `export type GameMode = 'campaign' \| 'endless' \| 'daily';` `[VERIFIED: src/services/storage/types.ts:44]` |
| Outcome set | `export type RunOutcome = 'win' \| 'lose' \| 'abandoned';` `[VERIFIED: src/services/storage/types.ts:47]` |
| Bounded-ring precedent + its reasoning | `export const RECENT_RUNS_BOUND = 50 as const;` preceded by *"~120 bytes/entry × 50 ≈ 6KB against the ~2MB Android CursorWindow practical ceiling — orders of magnitude of headroom."* `[VERIFIED: src/services/storage/types.ts:49-53]` |
| Per-mode key constant precedent | `export const ENDLESS_TELEMETRY_KEY = 'endless' as const;` `[VERIFIED: src/services/storage/types.ts:145]` |
| `daily` already parses | `const GAME_MODE_SET = new Set<string>(['campaign', 'endless', 'daily']);` `[VERIFIED: src/services/storage/parseBlob.ts:314]`, and `out.byMode.daily = sanitizeAggregateMap(byMode.daily);` in `sanitizeTelemetry` `[VERIFIED: src/services/storage/parseBlob.ts]` |
| Blob key / version | `export const PROGRESS_VERSION = 4 as const;` / `export const PROGRESS_KEY = '@nbb/progress/v4' as const;` `[VERIFIED: src/services/storage/types.ts:20-21]` |
| **`RecordRunEndArgs` has NO daily arm yet** | the union is `{ mode: 'campaign'; … } \| { mode: 'endless'; … }` only `[VERIFIED: src/services/storage/types.ts:279-299]` — **this is phase work, not "already solved"** |
| SC-5 mechanism ships | *"an endless or daily run must never move bestByLevel, bestScore or the unlock ladder"* `[VERIFIED: src/services/storage/memoryStore.ts:96-99 and src/services/storage/asyncStorageStore.ts:376-379]` — **verify, do not rebuild** |
| World path is mode-agnostic | *"Mode-agnostic by construction… and therefore Phase 12's daily challenge reuses it verbatim."* `[VERIFIED: src/runtime/worldRequests.ts:55-56]` |

### The two discretionary numbers

**`DAILY_DIFFICULTY` — recommend `10`.** D-11 asks for "a fixed constant, mid-scale" and
leaves the exact number to discretion. The generator's published table
`[CITED: docs/ops/BOARD-GENERATOR.md:171-193]` gives, at `d = 10`, the row `| 10 | 12 | 72 | 116 | 3 | 3 |`
— 12 rows used, 72 bricks, 116 authored HP, 3 explosives per half, 3 steel pairs per half.
The same document's calibration line reads: *"`d = 0` matches `level-01`'s 32 bricks, `d ~ 13`
matches `level-03`'s 94-brick showpiece, `d = 20` exceeds the hardest shipped board by ~36 %."*
So `10` sits between the tutorial level and the showpiece — recognisably a real board, not a
warm-up, and not the hardest thing the generator can make. The sweep's per-difficulty median
clear times run *"56 s at `d = 0` to 197 s at `d = 20`"* `[CITED: docs/ops/BOARD-GENERATOR.md:287-288]`,
putting `d = 10` near a two-minute median — the right size for a once-a-day sitting. It is
also exactly where endless arrives at wave 11 (`difficultyForWave` is `wave - 1`, clamped,
`[VERIFIED: src/services/endless/ramp.ts:56-68]`), so a daily board is directly comparable to
a familiar point on the shipped ramp. **One caveat the planner should carry:** the same sweep
recorded *"0 non-wins — every board cleared with `bricksRemaining === 0`"*
`[CITED: docs/ops/BOARD-GENERATOR.md:280]`, which is what makes D-13's "streak counts dates
played, not won" safe — no date can draw an unwinnable board.

**`DAILY_HISTORY_BOUND` — recommend `400`, with the Phase 9 arithmetic.** A history entry is
`{ date: 'YYYY-MM-DD', score: number, outcome: 'win' | 'lose' }`, which serialises to roughly
45 bytes of JSON. At 400 entries that is ~18 KB — the same order as `RECENT_RUNS_BOUND`'s
stated ~6 KB and still three orders of magnitude inside the *"~2MB Android CursorWindow
practical ceiling"* the shipped comment names. `400` was chosen over a rounder `365` for one
reason that is specific to this phase: D-17's streak-ended line is **omitted** whenever the
backward walk reaches the window floor while still consecutive, so the window size is
directly the longest streak the UI can ever report as ended. A 400-day window means the line
is only suppressed for a player who has played over 400 consecutive days — at which point the
omission is a rounding error on an extraordinary run. `[ASSUMED]` — the byte estimate is
arithmetic over a shape this phase has not yet fixed, and the choice of 400 over 365 or 512 is
a judgement, not a measurement. The planner should treat the *reasoning* as inherited and the
*number* as confirmable.

---

## Runtime State Inventory

Not applicable — this is a greenfield feature phase, not a rename, refactor or migration.
No string is being replaced, no identifier renamed and no stored key changed
(`PROGRESS_KEY` stays `'@nbb/progress/v4'`). The one adjacent question — whether the new
blob fields need a migration — is answered by the existing parser: `sanitizeTelemetry` reads
each field independently and defaults absent ones, so a v4 blob written *before* this phase
parses into a blob *with* an empty daily record and **no version bump**.
`[VERIFIED: src/services/storage/parseBlob.ts, sanitizeTelemetry]`

---

## State of the Art

| Old approach | Current approach | When changed | Impact |
|---|---|---|---|
| "Hermes has no `Intl`; ship `@formatjs` polyfills" — the long-standing React Native folk rule | Hermes ships `Intl` (`Collator`, `DateTimeFormat`, `NumberFormat`, `getCanonicalLocales`) backed by platform locale data, on both platforms, in debug and release | Android build has `-DHERMES_ENABLE_INTL=True` unconditionally in RN 0.86's `hermes-engine/build.gradle.kts`; iOS artifact verified directly | The polyfill reflex is obsolete — **and irrelevant here**, because the correct answer is to use no `Intl` at all. Named so a plan does not add a polyfill package "for safety". |
| `jsEngine` a choice between JSC and Hermes | *"The Hermes engine is the default JavaScript engine used by Expo and it is fully supported across all Expo tooling."* `[CITED: https://docs.expo.dev/guides/using-hermes/]`; this repo pins it explicitly (`"expo.jsEngine": "hermes"`, `ios/Podfile.properties.json`) | Expo SDK ≥ 48 era | There is exactly one engine to reason about. Every probe in this document targets it. |

**Deprecated / not to be used here:**

- `toLocaleDateString()` / `Intl.DateTimeFormat().format()` for a machine key — breaks SC-1
  across device locales (Finding 2).
- `toISOString().slice(0, 10)` for a *local* date — wrong for a third of every day
  (Finding 3(e)).
- `now + 86_400_000` for "tomorrow" — wrong on every DST day (Finding 3(c)).

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | `DAILY_HISTORY_BOUND = 400` (~18 KB at ~45 bytes/entry) is the right window size | § The two discretionary numbers | Low. Too small → D-17's streak-ended line is omitted more often than intended (a silent, honest degradation, never a wrong number). Too large → a few tens of KB in a blob already budgeted against ~2 MB. Either way reversible: the bound is one constant applied at write *and* read. |
| A2 | `DAILY_DIFFICULTY = 10` is the right "mid-scale" constant | § The two discretionary numbers | Low-to-moderate. The supporting brick counts and median clear times are cited from `docs/ops/BOARD-GENERATOR.md`, but no daily-specific playtest exists. Reversible for a new player; **not** reversible for scores already recorded, since D-11's whole point is cross-date comparability. Worth one confirmation before the first plan executes. |
| A3 | Naming the new record `TelemetryBlob.daily` (mirroring `TelemetryBlob.endless`) rather than `dailyRecord` | § Pitfall 2 | Low, but it is a fork in the road that must be taken deliberately — the near-collision with `byMode.daily` is real. |
| A4 | Android Hermes behaves identically to the probed Apple build for `Date` local getters and the per-runtime zone cache | § Finding 4, § Device Verification Items | Moderate. The `Date` local-time path is the same C++ in the same Hermes source tree, but the tz database is bionic's and the build is a separate compilation. If Android differs, the *key* derivation is still correct (it reads whatever zone the platform reports); only the staleness window of Pitfall 5 would differ. |
| A5 | Adding an optional `onForeground` to `subscribeAppStateAutoPause` will not disturb the D-15 "never auto-resume" invariant | § Pitfall 7 | Low, but the file's comment exists precisely to stop this edit. Whichever route the plan takes must be stated as a task with its own test. |

---

## Open Questions

1. **Does the plan add `onForeground` to the shipped AppState helper, or give the daily host its own subscription?**
   - What we know: the UI-SPEC requires a foreground refresh; `subscribeAppStateAutoPause`
     has no `active` branch and says so deliberately.
   - What is unclear: which of the two routes the project prefers, given that Phase 14 will
     rework the entry point anyway.
   - Recommendation: add the optional callback to the shared helper (one subscription, one
     place to reason about AppState), and pin the "no physics resume" invariant with a test
     asserting `onAutoPause` is not called on `active`.

2. **Where does `DAILY_DIFFICULTY` live — `src/services/daily/` or `src/levelgen/`?**
   - What we know: `src/services/endless/ramp.ts` keeps the *policy* out of `levelgen` and
     reads `D_MAX` through the barrel rather than restating it, on the stated grounds that
     *"the clamp and the table it indexes must move together or not at all."*
   - Recommendation: `src/services/daily/`, following that precedent exactly, and clamp in
     the module's own body rather than relying on `generate`'s backstop — the same argument
     `ramp.ts` makes for itself.

3. **Does the N-DAILY-03 ops doc live at `docs/ops/DAILY-CHALLENGE.md`?**
   - What we know: `docs/ops/` holds `ENDLESS-MODE.md`, `BOARD-GENERATOR.md`,
     `PROGRESS-STORAGE.md` — one per feature area, and the ROADMAP declares no
     `Canonical refs:` line for Phase 12.
   - Recommendation: yes, and it must contain D-01 as a single sentence plus the Pitfall 5
     timezone sentence. Anything longer stops being a policy a reader can hold in their head,
     which CONTEXT § Specific Ideas names as the criterion.

4. **Should the `__DEV__` dev-row wrap fix be taken?**
   - What we know: the UI-SPEC measured the row at ≈431–475 px once `Daily` is added, against
     a 375 pt viewport, and marked the fix "recommended, not required".
   - Recommendation: take it. It is three style properties, the slot already carries
     `pointerEvents="box-none"`, and without it the phase's own new control is being added to
     a row that the same document measured as **already clipping at its default tier state**.

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Hermes JS engine | The entire date derivation | ✓ | `250829098.0.17` (`hermes-v0.17.0`); `"expo.jsEngine": "hermes"` in `ios/Podfile.properties.json` | — (no alternative engine is configured) |
| `Intl` in Hermes | *nothing* — deliberately unused | ✓ (partial: `Collator`, `DateTimeFormat`, `NumberFormat`, `getCanonicalLocales`) | ECMA-402 subset; `resolvedOptions().calendar` absent | Not needed |
| `expo-localization` | *nothing* — deliberately not installed | ✗ (exists in SDK 57, not a dependency) | — | Not needed; `Date` local getters cover D-04 |
| Network | *nothing* — SC-1 forbids it | n/a | — | n/a |
| `vitest` | The whole validation architecture | ✓ | `5.0.1` | — |
| `jsdom` | UI-tier tests via `@vitest-environment jsdom` docblock | ✓ | `^29.1.1` | — |
| `@testing-library/react` | Host-level daily run test | ✓ | `^16.3.3` | — |
| `process.env.TZ` reassignment under vitest | TZ-pinned DST tests | ✓ verified by running a throwaway spec this session (3/3 passed, then deleted) | Node 25.6.0 | — |
| `zdump` | Confirming the 2026 tz transitions used in the tests | ✓ | system (macOS) | Transition instants are now written down in this document; no ongoing dependency |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:** none.

**One environment discrepancy worth surfacing (not a blocker for this phase):**
`package.json` declares `"engines": { "node": ">=24 <25" }` while the installed toolchain is
Node **v25.6.0**. The date probes in this document were run on v25.6.0 and agreed with Hermes
exactly, so nothing in the recommended derivation depends on the difference — but the
declared range and the installed runtime disagree, and a CI image honouring the range would
run a different V8. `[VERIFIED: package.json engines; node --version]`

---

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | `vitest` 5.0.1 (`package.json` devDependencies) |
| Config file | `vitest.config.ts` — `environment: 'node'`, include `['src/core/**/*.test.ts', 'tests/**/*.test.ts', 'tests/**/*.test.tsx']`, `resolve.alias` maps `react-native` → `react-native-web` |
| UI environment | per-file docblock `@vitest-environment jsdom` (e.g. `tests/ui/HudStrip.test.tsx:4`) — **not** set globally |
| Quick run command | `npx vitest run tests/daily.date-key.test.ts tests/daily.streak.test.ts` |
| Per-area run | `npx vitest run tests/daily` |
| Full suite command | `npm test` → `vitest run && node scripts/assert-worklet-closures.mjs && node scripts/assert-level-solvability.mjs && node scripts/assert-eas-profiles.mjs && node scripts/assert-brand-name.mjs` |
| Type gate | `npm run typecheck` (`tsc --noEmit`) — **load-bearing this phase**: the `RecordRunEndArgs` daily arm is enforced by the compiler, not by a test |
| Lint gate | `npm run lint` — **load-bearing this phase**: `boundaries/dependencies` is what keeps `DailyResultOverlay` free of `services` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test type | Automated command | File exists? |
|---|---|---|---|---|
| N-DAILY-01 | `localDateKey` is the local date, not UTC, at both edges of a day | unit | `npx vitest run tests/daily.date-key.test.ts -t "local not UTC"` | ❌ Wave 0 |
| N-DAILY-01 | `localDateKey` is invariant across device locale (regression guard for Finding 2) | unit | `npx vitest run tests/daily.date-key.test.ts -t "locale invariant"` | ❌ Wave 0 |
| N-DAILY-01 | Skipped local midnight — America/Santiago 2026-09-06 resolves to `2026-09-06T04:00:00.000Z` | unit (TZ-pinned) | `npx vitest run tests/daily.date-key.test.ts -t "skipped midnight"` | ❌ Wave 0 |
| N-DAILY-01 | Repeated local midnight + 25-hour day — America/Havana 2026-11-01 day length is `90_000_000` | unit (TZ-pinned) | `npx vitest run tests/daily.date-key.test.ts -t "25 hour day"` | ❌ Wave 0 |
| N-DAILY-01 | `nextLocalMidnightMs` ≠ `now + 86_400_000` on both DST days (the anti-pattern, pinned) | unit (TZ-pinned) | `npx vitest run tests/daily.date-key.test.ts -t "not plus 24h"` | ❌ Wave 0 |
| N-DAILY-01 | Month / year / leap rollover of `getDate() + 1` | unit | `npx vitest run tests/daily.date-key.test.ts -t "rollover"` | ❌ Wave 0 |
| N-DAILY-01 | Same key → byte-identical `LevelFileV1`; 731 consecutive keys → 731 distinct boards | unit | `npx vitest run tests/daily.board.test.ts` | ❌ Wave 0 |
| N-DAILY-01 | No network: no `fetch`/`XMLHttpRequest` on the daily path | unit (source contract) | `npx vitest run tests/daily.board.test.ts -t "no network"` | ❌ Wave 0 |
| N-DAILY-02 | A closed date is not replayable; re-open returns the stored record and does **not** call `generate` | integration | `npx vitest run tests/daily.record.test.ts` | ❌ Wave 0 |
| N-DAILY-02 | `abandoned` does **not** close the date (D-07); `win`/`lose` do | integration | `npx vitest run tests/daily.record.test.ts -t "abandoned leaves open"` | ❌ Wave 0 |
| N-DAILY-02 | History is bounded at write **and** at read | unit | `npx vitest run tests/daily.record.test.ts -t "bounded"` | ❌ Wave 0 |
| N-DAILY-02 | `streakFrom` — consecutive extends, one gap resets, D-16 scalars survive trimming | unit | `npx vitest run tests/daily.streak.test.ts` | ❌ Wave 0 |
| N-DAILY-02 | `endedStreakLength` returns `null` at the window floor and never substitutes `longestStreak` | unit | `npx vitest run tests/daily.streak.test.ts -t "window floor"` | ❌ Wave 0 |
| N-DAILY-03 | Clock backwards → a date with a result stays read-only (D-02) | unit (TZ + injected clock) | `npx vitest run tests/daily.clock-policy.test.ts -t "backwards"` | ❌ Wave 0 |
| N-DAILY-03 | Clock forwards a week → new date playable, streak broken by the gap, no anti-cheat branch (D-03) | unit | `npx vitest run tests/daily.clock-policy.test.ts -t "forwards"` | ❌ Wave 0 |
| N-DAILY-03 | A daily `recordRunEnd` leaves `bestByLevel`, `unlocked`, `bestScore`, `telemetry.endless` and `stars` byte-identical (SC-5) | integration | `npx vitest run tests/storage.daily-firewall.test.ts` | ❌ Wave 0 — model on the shipped `tests/storage.endless-firewall.test.ts` |
| N-DAILY-03 | An invalid / tampered date key in the blob degrades to "no result" rather than rendering | unit | `npx vitest run tests/daily.record.test.ts -t "invalid key"` | ❌ Wave 0 |
| UI (12-UI-SPEC) | `__DEV__` `Daily` press on an open date starts a run; on a closed date renders the panel and starts none | integration (jsdom) | `npx vitest run tests/ui/PlayingHost.daily-run.test.tsx` | ❌ Wave 0 — model on the shipped `tests/ui/PlayingHost.endless-run.test.tsx` |
| UI (12-UI-SPEC) | Dev-row control press during a live daily run records `{ mode: 'daily', outcome: 'abandoned' }` and leaves the date open | integration (jsdom) | `npx vitest run tests/ui/PlayingHost.daily-run.test.tsx -t "abandoned"` | ❌ Wave 0 |
| UI (12-UI-SPEC) | Countdown: the three copy forms, the `≤ 0` / non-finite omission, and the `25h 0m` case | unit (jsdom, injected `now`) | `npx vitest run tests/ui/DailyResultOverlay.test.tsx` | ❌ Wave 0 |
| UI (12-UI-SPEC) | `DailyResultOverlay` renders no `Retry` on a closed date, no star row, no `Best ·` line | unit (jsdom) | `npx vitest run tests/ui/DailyResultOverlay.test.tsx -t "closed date"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/daily` plus `npm run typecheck` — the type gate is
  not optional this phase, because `RecordRunEndArgs`'s daily arm is the SC-5 mechanism and a
  passing test suite says nothing about whether it compiles in both stores.
- **Per wave merge:** `npm test && npm run typecheck && npm run lint`. `lint` is included
  deliberately: `boundaries/dependencies` is the only thing preventing
  `DailyResultOverlay` from importing `src/services/storage`, and no unit test observes that.
- **Phase gate:** full suite green, plus the device-verification checklist below resolved or
  explicitly routed to human verification, before `/gsd-verify-work`.

### TZ pinning — the mechanic, verified

`process.env.TZ` reassigned **inside** a running test is honoured by Node and changes the
result of subsequent `Date` local getters. Confirmed this session by running a throwaway spec
through the project's own `npx vitest run` (3 tests, 3 passed) and deleting it; `git status`
confirms the tree is unchanged.

Two rules for any TZ-pinned spec, because `process.env.TZ` is **process-global** and vitest's
default pool reuses a worker across files:

```ts
const ORIG_TZ = process.env.TZ;
afterEach(() => { process.env.TZ = ORIG_TZ; });
```

and never rely on the ambient zone — a test that passes only in `Asia/Manila` is a test that
fails in CI.

### Wave 0 Gaps

- [ ] `tests/daily.date-key.test.ts` — covers N-DAILY-01 (derivation, DST, rollover, locale invariance)
- [ ] `tests/daily.streak.test.ts` — covers N-DAILY-02 (D-13, D-14, D-16, D-17 derivation)
- [ ] `tests/daily.record.test.ts` — covers N-DAILY-02 (once-per-date, bounds, invalid key)
- [ ] `tests/daily.clock-policy.test.ts` — covers N-DAILY-03 (D-01, D-02, D-03)
- [ ] `tests/daily.board.test.ts` — covers N-DAILY-01 (determinism, 731-key distinctness, no network)
- [ ] `tests/storage.daily-firewall.test.ts` — covers N-DAILY-03 / SC-5; clone `tests/storage.endless-firewall.test.ts`
- [ ] `tests/ui/PlayingHost.daily-run.test.tsx` — covers the UI-SPEC run boundaries; clone `tests/ui/PlayingHost.endless-run.test.tsx` (which already `fireEvent.click`s dev-row `Pressable`s by accessibility name and asserts over a mocked `recordRunEnd`)
- [ ] `tests/ui/DailyResultOverlay.test.tsx` — covers the panel, countdown forms and the closed-date control rule
- [ ] Framework install: **not needed** — `vitest`, `jsdom` and `@testing-library/react` all present
- [ ] Shared fixtures: **not needed** — `tests/helpers/` holds only `balanceBot.ts`; the daily specs need no shared fixture beyond the per-file TZ guard above

### What the instrument cannot observe

Stated explicitly, per the Phase 11 lesson that a claim must not outrun its instrument:

- **jsdom does no layout.** It cannot confirm the 11-row panel fits, that the dev row does not
  clip, or that the countdown line does not wrap. The UI-SPEC already marks these `backstop`;
  this phase must not record a passing `render()` as having verified any of them.
- **vitest runs on Node/V8, not on Hermes.** Node and Hermes agreed exactly on both DST cases
  probed here, which is why the tests are worth writing — but a green suite is evidence about
  V8. The Hermes evidence in this document comes from executing Hermes directly, and the
  Android slice was never executed at all.
- **No test can observe a real DST rollover or a real timezone change on a device.** Both are
  in § Device Verification Items.

---

## Device Verification Items

Routed to human verification, not folded into a confident recommendation.

| # | Item | Why it cannot be checked here | Suggested check |
|---|---|---|---|
| 1 | Android Hermes `Date` local getters and `nextLocalMidnightMs` on a 23h/25h day | Only the Apple slice of the SDK 57 Hermes artifact was executable on this machine. The Android engine is a separate compilation against bionic's tzdata. | On an Android device or emulator, set the system zone to `America/Santiago`, set the date to 2026-09-05 23:58 local, and confirm the app's date key advances to `2026-09-06` at 01:00 and the countdown reads ~2 minutes beforehand. |
| 2 | Hermes's per-runtime timezone cache **on device** (Finding 4) | Reproduced by `setenv`+`tzset` in a desktop harness. A real OS timezone change on iOS/Android is a different mechanism (a system notification), and whether Hermes re-reads on it was not observable here. | With the app foregrounded, change the device timezone across a date boundary (e.g. `Pacific/Kiritimati` ↔ `Pacific/Niue`, 25 h apart) and observe whether the rendered `Daily · {date}` changes without an app relaunch. **If it does change, Pitfall 5's consequence is narrower than described and the ops-doc sentence should be softened — not deleted.** |
| 3 | A real local-midnight rollover with the app foregrounded | No test can advance a device's wall clock across midnight while the runtime lives. | Leave the Daily Result panel open across local midnight on a physical device; confirm the countdown does not render a negative value, the line is omitted at `≤ 0`, and the date re-derives (UI-SPEC § Clock policy rule 5). |
| 4 | The `__DEV__` dev row with `Daily` added, on a 375 pt viewport | jsdom does no layout; the ≈431–475 px figure is computed from font metrics. | Already a `backstop` row in `12-UI-SPEC.md` § UI Considerations E5. Confirm on a 375 pt device that `Daily` is fully on-screen and tappable. |
| 5 | The fully-populated 11-row panel on a 320×568 pt viewport | Same. | Already a `backstop` row in `12-UI-SPEC.md` § Authored beyond the probe set. |

---

## Security Domain

Security enforcement is not disabled in `.planning/config.json`, so this section is required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard control |
|---|---|---|
| V2 Authentication | no | No account, no login — PROJECT.md rules out a server and an account entirely. |
| V3 Session Management | no | No session. |
| V4 Access Control | no | Single-user local app; no multi-tenant surface. |
| V5 Input Validation | **yes** | The only externally-influenced input this phase reads is the **persisted blob**, which on a rooted/jailbroken device is attacker-controllable. Control: strict validation of the date key on read (`isValidDateKey`, integer-only, no `Date` parsing) plus the existing `safeCounter` coercion for every number. Invalid entries are **dropped**, degrading to "no stored result". |
| V6 Cryptography | no — and one explicit non-use | Nothing is signed, encrypted or authenticated. `src/levelgen/rng.ts:15-18` states it verbatim: *"this is a deterministic generator and explicitly NOT a CSPRNG. Its entire contract is that its output is reproducible from the seed, i.e. fully predictable. Never reuse it for a token, nonce, key or session id."* The date-derived seed inherits that: it is a *public, guessable* value by design. |
| V7 Error handling & logging | partial | The UI-SPEC already fixes the policy: no error modal anywhere, read failure → treat as open, write failure → render the in-memory record. Nothing logs the blob. |
| V13 API | no | No API, no network call — SC-1 forbids one. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard mitigation | Status in this phase |
|---|---|---|---|
| Blob tampering to fabricate a streak (rooted device, AsyncStorage is plaintext) | Tampering | **Accepted, by design.** D-05 rejects a watermark; PROJECT.md rules out a server, so there is no authority to validate against and no leaderboard to protect. An offline single-player streak has no adversary but the player. | Named, not mitigated — correctly |
| Blob tampering to *crash or corrupt* the app | Denial of service | Fail-soft parse, established Phase 9 (C1 D-09): every field is sanitized independently and a corrupt `telemetry` cannot discard `unlocked` / `bestByLevel` / `bestScore` | Inherited; the new daily fields must join it (`sanitizeDailyRecord`) |
| Unbounded growth of a read-whole-on-open blob | Denial of service | `.slice(-BOUND)` at write **and** read | § Pattern 2; **Pitfall 1 is the live instance of this threat in this phase** |
| Oversized / non-ASCII string rendered verbatim into a fixed-width panel | Denial of service (UI) | `isValidDateKey` on read; entries failing it are dropped | § Pitfall 8 |
| Slopsquatted / hallucinated dependency | Tampering (supply chain) | Zero packages added | § Package Legitimacy Audit |
| Seed predictability used to pre-compute the board | *(not a threat)* | — | The board is *intended* to be identical for everyone on a given date. Predictability is the feature. |

---

## Sources

### Primary (HIGH confidence)

- **Executed under Hermes `250829098.0.17`** (the exact build in `ios/Pods/hermes-engine-artifacts/hermes-ios-250829098.0.17-release.tar.gz`, run via a JSI harness compiled against its macOS slice this session) — `Intl` surface; `resolvedOptions()`; locale-varying `toLocaleDateString` across `th-TH`/`ar-SA`/`fa-IR`/`ja-JP`/`en-GB`; the Santiago skipped midnight; the Havana repeated midnight and 25-hour day; `now + 86_400_000` failure in both directions; `toISOString().slice(0,10)` divergence; month/year/leap rollover; `padStart` availability; the per-runtime timezone cache with a C `localtime_r` control.
- **Binary inspection** (`strings`, `nm -u`, `otool -L`, `c++filt`) of `hermesvm.xcframework/ios-arm64/hermesvm.framework/hermesvm`, release and debug — Intl symbol set; absence of `PluralRules`/`RelativeTimeFormat`/`ListFormat`/`Segmenter`/`DisplayNames`/`Intl.Locale`; Foundation/CoreFoundation/libobjc linkage; `NSLocale`/`NSCalendar`/`NSDateFormatter`/`NSTimeZone`/`CFLocaleCopyCurrent` imports.
- **In-repo source, read this session** — `src/levelgen/generate.ts`, `src/levelgen/rng.ts`, `src/levelgen/schedule.ts`, `src/services/storage/types.ts`, `src/services/storage/telemetry.ts`, `src/services/storage/parseBlob.ts`, `src/services/storage/memoryStore.ts`, `src/services/storage/asyncStorageStore.ts`, `src/services/endless/ramp.ts`, `src/runtime/appStatePause.ts`, `src/runtime/worldRequests.ts`, `app/_components/PlayingHost.tsx`, `eslint.config.js`, `vitest.config.ts`, `package.json`, `app.config.js`, `ios/Podfile.properties.json`, `node_modules/react-native/ReactAndroid/hermes-engine/build.gradle.kts`, `node_modules/react-native/sdks/.hermesversion`.
- **Executed locally** — `zdump -v` for the 2026 transitions of `America/Santiago`, `America/Havana`, `Asia/Beirut`; a Node replay of `hashSeed`/`mixSeed`/`makeRng` over 731 consecutive date keys; a throwaway `npx vitest run` spec proving TZ pinning works in this project's runner (deleted, tree clean).

### Secondary (MEDIUM confidence)

- `https://docs.expo.dev/versions/v57.0.0/` — SDK 57 module index (fetched 2026-09-27): `expo-localization` present; no date/clock/timezone module beyond it.
- `https://docs.expo.dev/versions/v57.0.0/sdk/localization/` — `getCalendars()` returns `timeZone`, `calendar`, `uses24hourClock`, `firstWeekday`; no date-formatting API; no Intl/polyfill guidance.
- `https://docs.expo.dev/guides/using-hermes/` — *"The Hermes engine is the default JavaScript engine used by Expo and it is fully supported across all Expo tooling."* No Intl statement on the page.
- `docs/ops/BOARD-GENERATOR.md` — the difficulty table (lines 171-193), the campaign calibration line (195), the sweep's clear-time distribution (280-289).
- `.planning/phases/12-daily-challenge/12-UI-SPEC.md` — approved contract, inherited whole.

### Tertiary (LOW confidence)

- None. Every claim in this document is either executed, read from a cited source line, or
  tagged `[ASSUMED]` in § Assumptions Log.

---

## Metadata

**Confidence breakdown:**

- **Date derivation (the one real unknown):** HIGH — executed inside the exact shipped Hermes build, with a C-level control for the one surprising result, and independently reproduced under the project's own vitest runner.
- **Standard stack:** HIGH — zero packages added; every reused component read from source this session with its line cited.
- **Architecture / module placement:** HIGH — dictated by `eslint.config.js` `boundaries/dependencies`, which is machine-enforced, not a convention.
- **Pitfalls 1, 2, 4, 6, 7, 8:** HIGH — each traced to a specific shipped line or an executed measurement.
- **Pitfall 5 (timezone cache) *on device*:** MEDIUM — the engine behaviour is HIGH-confidence (executed, with control); whether a real OS timezone change reaches Hermes by a different path was not observable here. Routed to § Device Verification Items #2.
- **Android parity:** MEDIUM — the Android build flag is verified from source, the runtime behaviour is not. Routed to § Device Verification Items #1.
- **The two discretionary numbers:** MEDIUM — reasoning inherited from cited project documents; the numbers themselves are judgements, logged as A1/A2.

**Research date:** 2026-09-27
**Valid until:** 2026-10-27 (30 days). The engine findings are pinned to `hermes-v0.17.0` / RN 0.86.3 / Expo SDK 57 and only need re-checking on an SDK bump; the in-repo findings only need re-checking if `src/services/storage/types.ts` or `eslint.config.js` change.
