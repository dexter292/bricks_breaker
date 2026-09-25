# Phase 4: Level Format & Brick Types - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-20
**Phase:** 04-level-format-brick-types
**Areas discussed:** Authoring shape, Damage readability, Second level identity, Load & fail behavior

---

## Authoring shape

| Option | Description | Selected |
|--------|-------------|----------|
| Row-strings + brick-type table | Diffable, editor-friendly | ✓ |
| Grid 2D JSON | Explicit but verbose | |
| Sparse cells | Compact when sparse; hard to “see” layout | |

**User's choice:** Row-strings + brick-type table; versioned JSON; validate before compile; compile to SoA once per load.

| Option | Description | Selected |
|--------|-------------|----------|
| Type table in each level file | Self-contained | ✓ |
| Shared catalog JSON | Shared types across levels | |
| Hybrid catalog + overrides | | |

**User's choice:** Per-level type table; independently editable.

| Option | Description | Selected |
|--------|-------------|----------|
| `.` (spaces only if schema allows) | Canonical empty; no silent trim | ✓ |
| `0` / `_` only | | |
| You decide | | |

**User's choice:** `.` canonical; no silent row trim.

| Option | Description | Selected |
|--------|-------------|----------|
| `schemaVersion: 1` + migrations when bumping | Reject unsupported with actionable errors | ✓ |
| Filename versioning only | | |
| You decide | | |

**User's choice:** Root `schemaVersion: 1`; migrations only on new version.

---

## Damage readability

| Option | Description | Selected |
|--------|-------------|----------|
| Crack/chip lines by HP | Non-color; lightweight | ✓ |
| HP numbers on bricks | Clear but noisy | |
| Pattern fill | | |
| Crack + number hybrid | | |

**User's choice:** Crack/chip lines; distinguishable without color alone.

| Option | Description | Selected |
|--------|-------------|----------|
| Steel/gray + fixed hatch/glyph | Unbreakable never damage-morphs | ✓ |
| Thicker border only | | |
| You decide | | |

**User's choice:** Steel/gray + fixed structural glyph/hatch.

| Option | Description | Selected |
|--------|-------------|----------|
| Skia `recordFrame` entity layer | No React overlays | ✓ |
| React overlay | | |
| You decide | | |

**User's choice:** Skia entity layer; Phase 7 owns neon/particles/destruction.

---

## Second level identity

| Option | Description | Selected |
|--------|-------------|----------|
| Channel/corridor with unbreakables | Proves LVL-03 | ✓ |
| Dense multi-HP wall | | |
| Sparse/open | | |
| You decide | | |

**User's choice:** Corridor/channel `level-02`.

| Option | Description | Selected |
|--------|-------------|----------|
| Exactly 2 levels | Migrate phase3 → level-01 + level-02 | ✓ |
| 3+ samples | | |
| 1 + stub | | |

**User's choice:** Exactly two levels.

| Option | Description | Selected |
|--------|-------------|----------|
| Dev-only host switch | No menu / no Retry cycling | ✓ |
| Retry cycles levels | | |
| Always level-02 | | |

**User's choice:** Dev switch; same load/validate/compile/play path; no physics/render forks.

---

## Load & fail behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Default `level-01.json` | | ✓ |
| Default `level-02.json` | | |
| You decide | | |

**User's choice:** Default `level-01.json`.

| Option | Description | Selected |
|--------|-------------|----------|
| Fail loudly (console + overlay) | Never play invalid/partial | ✓ |
| Fallback to level-01 | | |
| Soft-warn partial play | | |

**User's choice:** Fail loudly; invalid data must not mutate World SoA.

| Option | Description | Selected |
|--------|-------------|----------|
| Validate+compile once on JS thread before resetWorld | Off hot path | ✓ |
| Precompile at bundle | | |
| You decide | | |

**User's choice:** Once on JS thread before gameplay init.

| Option | Description | Selected |
|--------|-------------|----------|
| Remove hardcoded phase3Grid; one pipeline | App + tests | ✓ |
| Keep hardcoded for tests | | |
| You decide | | |

**User's choice:** Remove `phase3Grid.ts` hardcoded impl; single pipeline; keep determinism.

---

## Claude's Discretion

- Brick-type char keys, crack geometry density, exact `level-02` corridor design, error overlay chrome, API naming (within layer contract)

## Deferred Ideas

- Full Level Editor product; level select menu; showpiece level (P8); neon/particles (P7); shared global type catalog
