# Phase 8 — Discussion Log

**Phase:** 08-showpiece-level-performance-certification-launch-baseline  
**Date:** 2026-09-21  
**Mode:** Interactive discuss (all 6 gray areas)

Human audit trail only — not consumed by researcher/planner/executor.

---

## Selection

User chose **all** six gray areas and set priorities: ~2–3 min neon showpiece; mandatory real-device 60 FPS before MVP complete; Phase 8 = quality / perf / soak / store baseline; **no** new gameplay or ad/IAP SDKs.

---

## 1. Showpiece level feel

### Q-A Escalation shape
| Option | Label |
|--------|--------|
| 1 | Three distinct acts + short plateaus (recommended) |
| 2 | Continuous climb |
| 3 | Two halves (warm-up / gauntlet) |
| 4 | Other |

**Selected:** 1

### Q-B Power-up pacing
| Option | Label |
|--------|--------|
| 1 | Keep ~20% Phase 5 drops |
| 2 | Slightly more in Act 2–3 |
| 3 | Fewer power-ups |
| 4 | Other |

**Selected:** 1

### User notes
- Three acts: accessible opening → denser multi-HP middle → unbreakable final pocket; short plateaus between acts
- Keep 20% drop + multi-ball/expand; no level-specific drop rules
- Balance to 2–3 min via layout/playtest; deterministic physics; Act 3 rewards paddle skill not luck

---

## 2. Level identity & boot path

### Q-A Showpiece identity
| Option | Label |
|--------|--------|
| 1 | New `level-03.json` (recommended) |
| 2 | Replace `level-01` |
| 3 | Rename e.g. `showpiece.json` |
| 4 | Other |

**Selected:** 1

### Q-B Title → Play boot
| Option | Label |
|--------|--------|
| 1 | Only showpiece |
| 2 | Showpiece default + `__DEV__` switch |
| 3 | Title level picker |
| 4 | Other |

**Selected:** 2

### User notes
- Preserve `level-01`/`level-02` as regression fixtures
- No production level-select UI
- DEV-only switch; same validate/compile/gameplay pipeline for all three

---

## 3. Device quality tiers

### Q-A Tier count
| Option | Label |
|--------|--------|
| 1 | Low / Mid / High (recommended) |
| 2 | Safe / Full |
| 3 | Mid + Low only |
| 4 | Other |

**Selected:** 1

### Q-B Selection method
| Option | Label |
|--------|--------|
| 1 | Auto only |
| 2 | Auto + `__DEV__` override (recommended) |
| 3 | In-app settings |
| 4 | Other |

**Selected:** 2

### User notes
- Mid = Pixel 6a baseline; Low reduces particles/trails/glow; High max within budget
- Conservative auto when hardware info insufficient
- Tier logic only in render/VFX; `core/` blind
- Mid fail → optimize/retune + re-cert; no silent Low downgrade claiming Mid pass

---

## 4. 60 FPS certification protocol

### Q-A Worst-case scene
| Option | Label |
|--------|--------|
| 1 | Scripted worst-case on showpiece (recommended) |
| 2 | Manual full run |
| 3 | Separate harness screen |
| 4 | Other |

**Selected:** 1

### Q-B Pass/fail & devices
| Option | Label |
|--------|--------|
| 1 | Pixel 6a Mid only hard gate |
| 2 | Pixel 6a Mid + required iPhone Instruments/feel |
| 3 | Substitute OK in Phase 8 (D-04) with later Pixel re-cert |
| 4 | Other |

**Selected:** 2 (plus user notes clarifying substitute = preliminary only)

### User notes
- Scripted max balls + peak particles + overlapping shake; fixed window; document conditions
- Profiling; ≥2× ≥30s; worse run; existing p95/jank thresholds
- Physical iPhone + Instruments required; install ≠ cert
- Substitute Android preliminary only; Pixel re-cert before MVP complete
- Fail → optimize + same scenario; no Mid target cut / required-effect disable to pass

---

## 5. Soak / leak test

### Q-A Script & duration
| Option | Label |
|--------|--------|
| 1 | Auto Title↔Playing + long play session (recommended) |
| 2 | Mount/unmount only |
| 3 | Long play only |
| 4 | Other |

**Selected:** 1

### Q-B Pass/fail gate
| Option | Label |
|--------|--------|
| 1 | Manual checklist + numbers |
| 2 | Max automation + mandatory manual device soak |
| 3 | Docs-only procedure |
| 4 | Other |

**Selected:** 2

### User notes
- 100 Title↔Playing then 15 min continuous play; profiling; physical device
- Verify teardown: loops, worklets, listeners, timers, audio; no duplicate ticks/subs
- Memory + frame-time start/end; no growth/drift/crash/unresponsive
- Lifecycle/pool asserts where feasible; device soak remains manual gate
- Harness DEV-only; no production / hot-path impact

---

## 6. Store compliance baseline

### Q-A Privacy policy depth
| Option | Label |
|--------|--------|
| 1 | Short public HTTPS policy (recommended) |
| 2 | Lawyer-ready full policy |
| 3 | Internal placeholder only |
| 4 | Other |

**Selected:** 1

### Q-B Paperwork depth in Phase 8
| Option | Label |
|--------|--------|
| 1 | Checklist + in-repo artifacts; no listing/submit |
| 2 | Artifacts + draft listing; no submit |
| 3 | Submit TestFlight / Play test track |
| 4 | Other |

**Selected:** 1

### User notes
- Document offline play, local high score, no ads/IAP/accounts; verify Expo/deps/platform collection
- iOS privacy manifest, Play Data Safety + age rating docs, name clearance, originality attestation in repo
- No store listings or TestFlight/Play submit in Phase 8
- Live URL + accurate artifacts required before marking PLT-04 done

---

## Deferred (captured during discuss)

- Production level picker / multi-level campaign
- Ad/IAP SDKs and store submission
- Music, haptics, combo juice (v2)
- Production quality settings UI
