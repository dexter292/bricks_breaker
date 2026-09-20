# Layer contract (ARCH-01)

Checkable crossing rules for Neon Brick Breaker. ESLint (`eslint.config.js`) and Vitest purity/smoke tests enforce the rows marked **Enforced**. Future rows are locked here so later phases do not invent ad-hoc imports.

## Allowed crossings

| ID | From → To | Mechanism | Notes | Enforced |
|----|-----------|-----------|-------|----------|
| LC-02 | `runtime/` → `core/` | Direct `'worklet'` call | Frame callback invokes `allocateWorld` / `step*` | ESLint boundaries |
| LC-03 | `render/` → `core/` | Read-only world view | Skia draw reads SoA fields; never mutates | ESLint boundaries |
| LC-04 | `app/` → `runtime/`, `render/`, `services/` | Mount / unmount / cold I/O | Thin Expo host; AsyncStorage + platform seams from app only | ESLint boundaries |
| LC-05 | `input/` → `runtime/` | Shared value write | Future: pan writes paddle target on UI thread | ESLint boundaries (dirs empty until later) |
| LC-09 | `core/` → `services/` | Event ring (batched ≤1/frame) | Future: no direct service imports from `core/` | Doc lock (ring, not import) |
| LC-10 | `runtime/` ↔ RN runtime | Mount / discrete phase only | Allocate world once; pause/teardown | Process (plan 03+) |
| LC-12 | `runtime/` → `render/` | Direct `'worklet'` call | Frame callback records `SkPicture` via `recordFrame` | ESLint boundaries |

## Banned crossings

| ID | Crossing | Why | Enforced |
|----|----------|-----|----------|
| LC-01 | `core/` → React / RN / Skia / Reanimated / Expo / `@react-native*` | Simulation must run unchanged in Node (D-09, D-11, D-12) | ESLint `no-restricted-imports` + Vitest purity |
| LC-06 | `core/` → any other app layer via import | Keeps the stub pure and worklet-portable | ESLint boundaries |
| LC-07 | `runtime/` or `render/` calling `runOnJS` / `scheduleOnRN` | No per-frame JS-thread hops (D-14) | ESLint `no-restricted-syntax` |
| LC-08 | `render/` mutating the world | Render is a consumer; mutation belongs in `runtime`/`core` | Boundaries + review |
| LC-11 | React state updates every physics/render frame | Breaks 60 FPS budget | Doc + later code review |

## How to verify

```bash
npx vitest run tests/core.smoke.test.ts tests/core.purity.test.ts
npx eslint src/core
# Negative probe: illegal import in core/ must fail eslint (see plan 01-02 SUMMARY)
```
