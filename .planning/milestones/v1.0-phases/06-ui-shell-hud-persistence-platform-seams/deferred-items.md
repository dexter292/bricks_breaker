# Deferred items — Phase 06

Logged during plan execution; out of current-task scope (do not fix inline).

| Found in | Item | Why deferred | Status |
|----------|------|--------------|--------|
| 06-01 | `tsc --noEmit`: `app/index.tsx` Property `fill` (suggests `fills`); overlays use `StyleSheet.absoluteFillObject` | Pre-existing; not introduced by storage plan; storage files tsc-clean | **RESOLVED — verified stale 2026-09-29** |

## 06-01, closed

**The item was already fixed and nobody closed the record.** Verified at HEAD rather than assumed:
`app/index.tsx` uses `styles.fills` — the exact name the deferral suggested — at both call sites
and in the `StyleSheet.create` block, and `npx tsc --noEmit` exits **0** with no output. The fix
landed in `5315401` (2026-09-21, *"SharedValue reset requests + overlay absoluteFill"*), and the
overlay half was carried by `5797753`.

It was surfacing in `gsd-tools audit-open` as the milestone's only outstanding deferred item, three
milestones after it stopped being true — so the close-out gate was counting a debt that had been
paid. Closed here rather than deleted, so the audit trail keeps the claim, the check and the date.
