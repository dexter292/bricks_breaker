---
status: testing
phase: 12-daily-challenge
source: [12-VERIFICATION.md]
started: 2026-09-28T16:00:00Z
updated: 2026-09-28T16:00:00Z
---

## Current Test

number: 1
name: Android Hermes date-key and nextLocalMidnightMs on a 23-hour DST day
expected: |
  Set the device zone to America/Santiago and the date to 2026-09-05 23:58 local.
  The daily date advances to 2026-09-06 at 01:00 local, and the countdown reads
  ~2 minutes beforehand. The Android ICU4J/bionic slice agrees with the measured
  Apple Hermes slice.
awaiting: user response

## Tests

### 1. Android Hermes date-key and `nextLocalMidnightMs` on a 23-hour DST day
expected: Zone America/Santiago, 2026-09-05 23:58 local. The daily date advances to 2026-09-06 at 01:00 local; the countdown reads ~2 minutes beforehand. Why human: every engine measurement in this phase comes from the Apple slice of the SDK 57 Hermes artifact — the Android slice was never executed. (WINDOWS #20)
result: [pending]

### 2. Android `Intl`/ICU4J locale invariance
expected: On a physical Android device set a non-Gregorian locale (`th-TH` or `fa-IR`); the rendered daily date is the same `YYYY-MM-DD` key on every locale. Why human: the five-locale measurement was taken on the Apple Hermes slice. This is the SC-1 break that is invisible on an en-US simulator. (WINDOWS #21)
result: [pending]

### 3. The per-runtime timezone cache ON DEVICE
expected: With the app foregrounded, change the device timezone across a date boundary. Per the documented limit `Daily · {date}` does NOT change until relaunch. If it DOES change, NARROW the Limits paragraph in `docs/ops/DAILY-CHALLENGE.md` — do not delete it. Why human: reproduced only by setenv+tzset in a desktop harness; a real OS timezone change is a different mechanism and was not observable. (WINDOWS #22)
result: [pending]

### 4. A real local-midnight rollover with the Daily Result panel open
expected: On a physical device, the countdown never renders a negative value and omits itself at or below zero. DO NOT check that the date re-derives — that half of clock-policy rule 5 is UNIMPLEMENTED by decision, and `12-VALIDATION.md`, WINDOWS #23 and Limit 8 all say so. Why human: no test can advance a device wall clock across midnight while the runtime lives. (WINDOWS #23)
result: [pending]

### 5. Daily Result panel horizontal fit at extreme values
expected: A 7-digit score, a 4-digit streak and a 5-digit days-played in the shipped 320px panel — no wrap, no clipping. Why human: jsdom performs no layout; the 27-character budget is computed from a measured 0.612 em advance and has never been observed on a rendered panel. A passing `render()` assertion must not be recorded as having verified this. (WINDOWS #16)
result: [pending]

### 6. Daily Result panel vertical fit
expected: The fully-populated 11-row panel on a 320x568 pt viewport — the `Menu` control visible without scrolling, the panel inside the safe area. Why human: jsdom supplies no safe-area insets; the 456px computed content height leaves headroom on paper only. (WINDOWS #17)
result: [pending]

### 7. The `__DEV__` dev row at 375 pt
expected: The `Daily` control is fully on-screen and tappable in the non-wrapping row. NOTE before judging: the row is ALREADY past 375 pt in its two default tier states BEFORE this phase added anything (computed ~431-475 px) — a check that does not know that will misattribute the clipping to `Daily`. (WINDOWS #18)
result: [pending]

### 8. Play a daily board as a human
expected: The difficulty, the window and the streak rules feel right. Why human: NO HUMAN HAS PLAYED A DAILY BOARD. Nothing in `docs/ops/DAILY-CHALLENGE.md` was calibrated by one, and its front matter says so. `DAILY_DIFFICULTY = 10` and `DAILY_HISTORY_BOUND = 400` are judgements, not measurements. (WINDOWS #24)
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
