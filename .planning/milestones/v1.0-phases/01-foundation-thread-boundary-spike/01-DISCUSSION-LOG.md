# Phase 1: Foundation & Thread-Boundary Spike - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-19
**Phase:** 1-Foundation & Thread-Boundary Spike
**Areas discussed:** Reference devices, Spike proof surface, Layer enforcement

---

## Reference devices

| Option | Description | Selected |
|--------|-------------|----------|
| Pixel 6 / 6a class | Matches research Android cliff reports | ✓ (Pixel 6a) |
| Pixel 7a / mid-tier Snapdragon | Newer mid-range | |
| Specific device already owned | User names exact model | |
| You decide | Claude picks and documents | |

**User's choice:** Pixel 6a as primary 60 FPS reference; physical recent iPhone for install/feel/stability; Android remains hard FPS gate; both — daily via dev-client, release/profile required to close Phase 1; allow temporary substitute Android with full documentation + Pixel 6a re-cert before MVP; never claim 60 FPS from simulator, dev builds alone, or untested hardware.

---

## Spike proof surface

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal FPS harness | Opaque Skia canvas, dummy sprites, worklet world, overlay | ✓ |
| Toy sandbox | Game-adjacent fake shapes | |
| Architecture demo screen | On-device checklist UI | |
| You decide | | |

| Sprite stress | Description | Selected |
|---------------|-------------|----------|
| ~200–300 | Matches roadmap “several hundred” | ✓ (completion target) |
| ~500+ | Harder early stress | |
| Scale until break | Discovery cliff | ✓ (research only, not completion) |

| Overlay | Description | Selected |
|---------|-------------|----------|
| ms/frame + rolling FPS + substeps | Full harness metrics | ✓ |
| FPS only | | |
| FPS + thread notes | | |

| Vitest core/ | Description | Selected |
|--------------|-------------|----------|
| Passing smoke test in Node | Prove RN-free core | ✓ |
| Scaffold only | Tests in Phase 2 | |

**Notes:** No gameplay, collision, or advanced VFX in Phase 1. Document measurement methodology.

---

## Layer enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Folders + ESLint/import boundaries | Fail illegal imports | ✓ |
| Folders + written contract only | Trust reviewers | |
| Monorepo packages | packages/core etc. | |
| You decide | | |

| core/ Phase 1 contents | Description | Selected |
|------------------------|-------------|----------|
| Stub + smoke test | Physics in Phase 2 | ✓ |
| Scaffold world types | Typed arrays without collision | |
| You decide | | |

| Harness location | Description | Selected |
|------------------|-------------|----------|
| src/runtime + src/render, thin app/ host | Recommended layout | ✓ |
| Throwaway spike/ folder | Reorganize later | |
| You decide | | |

| Hot-path JS hops | Description | Selected |
|------------------|-------------|----------|
| Zero runOnJS/scheduleOnRN on frame path | Shared-value overlay | ✓ |
| Allow one batched hop for overlay text | | |
| You decide | | |

**Notes:** No monorepo or unnecessary abstractions in Phase 1.

---

## Skia version (not discussed — confirmed research default)

**User's choice:** Keep research-recommended Skia 2.12.0 unless first hardware build reveals compatibility or performance issues; then fall back to 2.6.2.

---

## Claude's Discretion

- Expo screen naming / minor file layout within app/ and src/
- Overlay styling
- Exact ESLint boundary tooling
- Cliff-ramp trigger UX

## Deferred Ideas

- Gameplay, collision physics, advanced VFX
- Monorepo packaging
- Named iPhone as second hard FPS gate
