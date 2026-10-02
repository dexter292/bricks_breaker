---
status: partial
phase: 10-seeded-board-generator
source: [10-VERIFICATION.md, 10-SECURITY.md]
started: 2026-09-29T11:35:00Z
updated: 2026-09-29T11:45:00Z
---

## Current Test

[simulator batch complete — the balance question is the one that stays open, and no machine here can answer it]

## How this session was run

Run by the assistant on a booted **iPhone 17 simulator (402×874 pt)**, dev build from
DerivedData serving the **current** JS from Metro at HEAD. Phase 10 had **no UAT artifact at
all** until this file; this closes that gap without pretending a simulator settles what it
cannot.

## Tests

### 1. SC-1 determinism — the board Hermes renders is cell-for-cell what V8 generates
expected: the daily board is `generate(dateKey, DAILY_DIFFICULTY)`. Generate the same board in
Node at HEAD and compare it against what the device actually drew for the same date key. Any
divergence means Phase 12's daily challenge hands **different boards to device and CI**, which is
the exact failure A1 exists to rule out.
result: **pass, and it is the strongest evidence in this file.** Node at HEAD, for
`generate('2026-09-29', 10)`:

```
.132..231.   2.12..21.2   .1..33..1.   223....322
11..11..11   ..123321..   3.1E11E1.3   2.E1111E.2
.2X1..1X2.   2X113311X2   E1.1..1.1E   12X....X21
```
(`1`/`2`/`3` = HP tiers, `E` = explosive, `X` = steel, `.` = empty; rows 12–15 empty.)

**All twelve populated rows match the device render exactly** — every HP tier, every explosive,
every steel block, in the same cell. Read off the screenshot column by column against the Node
output above.

What this adds over the `A1 DISCHARGED` block in `docs/ops/BOARD-GENERATOR.md`: that reading was
taken **2026-09-25**, at phase 10's close, and phases 11, 12 and 13 have landed since. This
re-confirms it **at HEAD** by a different method — the earlier one compared a 32-bit corpus
fingerprint, this compares actual cell contents, and a fingerprint collision is conceivable where
a cell-for-cell match is not. What it does **not** do is replace the probe: one board against
4 200, and still a simulator.

### 2. SC-3 — a generated board fits the 360×640 playfield
expected: the generator's one lattice must fit. Arithmetic from the shipped grid
(`cols 10, rows 16, originX 2, brickW 32, gapX 4`): right edge = 2 + 10×32 + 9×4 = **358 ≤ 360**;
bottom = 48 + 16×14 + 15×2 = **302 ≤ 640**.
result: **pass** — confirmed by render on both a daily board and an endless wave-1 board. Nothing
clips at either edge. Honest limit, which `10-VERIFICATION.md` already states: D-02 gives exactly
one lattice, so this is eight numbers, not a distribution. 21 000 sweep iterations re-test the same
eight.

### 3. SC-5 — only shipped verbs, and no new brick type
expected: multi-HP, steel and explosive only.
result: **pass** — all three observed rendering on device (HP1/HP2/HP3 by colour, steel hatched,
explosive with the X glyph) and nothing else. No test counts emitted **particles**, so the Mid-tier
budget half of SC-5 is unobserved here as well as in the suite.

### 4. Determinism is NOT what endless does, and that is correct
expected: none — this test exists because the assistant predicted wrongly and the record should
say so.
result: **premise corrected.** Entering endless twice gave two different wave-1 boards, which
looked like a determinism failure and is not. `PlayingHost` mints `runSeedRef.current =
Date.now() >>> 0` per **run**, and `seedForWave(runSeed, wave)` derives from it, so wave 1 of two
different runs is deliberately a different board — the code comment says so at the site. SC-1 is
purity of `generate(seed, difficulty)`: same *arguments*, same board. Endless varies the argument
on purpose; **daily** is where determinism is user-visible, which is why test 1 uses it.

### 5. SC-2 — every generated board is clearable
expected: a human clears a generated board.
result: **not run, and a bot's WON must not be recorded as this.** The 21 000-board sweep and the
30-board bot sample both pass and are red-proved, and `10-VERIFICATION.md` measured that the two
are genuinely independent — under an invariant-disabled mutation the sweep red at `s=8 d=20` while
the bot sample, which includes `s=8 d=20`, still reported `WON`. Clearing one board here with a
widened-paddle affordance would add nothing either gate does not already establish.

### 6. SC-4 — difficulty monotonicity
expected: verified over the declared integer domain `[0, D_MAX]`, which the suite does by mutation.
result: **covered by the suite, not by this session.** The residual is recorded as **AR-10-03**:
the clamp is non-monotone *outside* that domain because `| 0` wraps mod 2³² before clamping, so
`Infinity`, `2**32` and `MAX_SAFE_INTEGER` all fold to difficulty **0** — the easiest board.
Unreachable from both shipped callers.

### 7. The balance question — is a generated board as good to play as a hand-authored one?
expected: a human plays several generated boards across the difficulty range and says.
result: **OPEN, and this is the phase's real gap.** The E2 playtest cohort (A3) was skipped.
**Nobody has ever played a generated board**, and the dials rest on perfect-bot clear time whose
p99 is 416 s and whose worst case is 1 495 s of *bot* play — a floor on human time, not an
estimate of it. The phase goal's clause is *"as safe to play as a hand-authored one"*; the **safe**
half is proved six ways and the **play** half has no evidence at all. No machine in this repository
can close it.

## Evidence provenance

| Kind | Count | What |
|---|---|---|
| assistant-measured on device | 3 | Tests 1–3. Test 1 compares against a Node board generated at HEAD, so it is a cross-engine comparison rather than an observation. |
| premise corrected | 1 | Test 4 — the assistant's, not the code's. |
| covered by the suite | 2 | Tests 5, 6 — recorded here so their absence from the device batch is not read as a gap. |
| human judgement | 0 | Test 7. **Zero is the finding.** |

**What a simulator settles for this phase, and what it does not.** It settles that the shipped
generator, running under Hermes on a real JS engine, produces the same cells as V8 for the same
seed at HEAD — which is the one claim device hardware is needed for and is now current rather than
four days and three phases stale. It settles nothing about whether the boards are any good. The
phase's own ops document is already honest about that (`BOARD-GENERATOR.md` § Limits, items 2
and 4), and this file does not improve on it.

**One incidental note.** `docs/ops/BOARD-GENERATOR.md` § Limits item 1 read *"A1 is UNMEASURED"*
directly above the block discharging it until 2026-09-29 — the audit's Finding 6, corrected in
`07b4e43`. The heading now names the residual that is genuinely open: the reading was a
**simulator**, and so is this one. A physical-device run has still not been observed either way.
