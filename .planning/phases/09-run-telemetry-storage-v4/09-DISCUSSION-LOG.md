# Phase 9: Run Telemetry & Storage v4 — Discussion Log

**Date:** 2026-09-25 · Mode: `discuss` (default, interactive)
Human reference only — downstream agents read `09-CONTEXT.md`, not this file.

## Areas offered

Four gray areas were presented; the user selected **all four**.

## Area 1 — What counts as a "run"

**Q: Retry tính là gì?**
Options: each retry is a new run (recommended) · retry continues the same session.
**Chosen:** each retry is a new run.
Note: Phase 6's RUN-03 (instant retry, no confirmation) was surfaced as context — retries
are frequent, so the counting rule matters.

**Q: Run bỏ dở (exit to Menu mid-run) thì ghi gì?**
Options: record with an `abandoned` outcome (recommended) · record nothing.
**Chosen:** record with a distinct outcome.
Rationale given: not recording makes lifetime totals silently understate what the player
did — five minutes of play showing "0 bricks broken".

## Area 2 — Mode dimension in the schema

**Q: v4 mode-aware ngay từ đầu?**
Options: yes, key on `(mode, levelId)` now (recommended) · no, campaign-only and bump later.
**Chosen:** mode-aware now.
Rationale given: Phases 11 and 12 each add a mode; deferring means two more migrations.

## Area 3 — History depth

**Q: Nhật ký run gần đây hay chỉ aggregate?**
Options: aggregate + bounded recent-run ring buffer (recommended) · aggregate only.
**Chosen:** aggregate + bounded log.
Rationale given: E2 had to write a throwaway bot because no run data existed; a bounded
log is the durable fix and unlocks "recently" statistics in Phase 14.

## Area 4 — Which counters

**Q: Ngoài bộ roadmap, ghi thêm gì?** (multi-select)
Offered: per-power-up-type counts · largest explosive cascade · wall-clock play time ·
longest rally.
**Chosen:** all four.

Note recorded at the time: "longest rally" was flagged in its own option text as
potentially a duplicate of best combo. The user selected it anyway, so CONTEXT D-10
defines it as the *survival* metric (consecutive paddle hits without losing a life),
explicitly distinct from combo, with an instruction that the planner must not merge them.

## Scope creep

None — discussion stayed inside the phase boundary. Statistics UI, achievement rules and
daily-streak storage were each routed to their owning phase in `<deferred>`.
