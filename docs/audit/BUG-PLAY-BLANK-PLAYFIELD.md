# BUG — Bấm Play: playfield trắng, bóng đứng yên

**Ngày:** 2026-09-24  
**Status:** **FIXED** 2026-09-24 — R-24…R-27 landed in working tree  
**HEAD at diagnose:** `a83fd6c` + uncommitted B1–B3/C1 host edits  
**Finding:** `R-24` … `R-28`

---

## 0. Kết luận

> **Nguyên nhân: race `pauseTimer` vs gate effect (`R-24`).**
>
> `setTimeout(0) → setActive(false)` chạy **sau** `setBakedKey` → gate `setActive(true)` → loop tắt vĩnh viễn: không `recordFrame` / không `stepWorld`, HUD vẫn sống.
>
> **Fix:** xóa `pauseTimer`; bake gọi `setActiveRef(false)` đồng bộ; gate effect là lời `setActive(true)` cuối khi `fxReady`.

---

## 1. `R-24` — Race `pauseTimer` vs effect gate · **FIXED**

- Removed `pauseTimer` / `clearTimeout(pauseTimer)` from bake effect in `PlayingHost.tsx`.
- Sync `setActiveRef.current(false)` at start of bake IIFE only.
- Gate effect unchanged: `fxReady` → `retry(); setActive(true)`.
- Regression: `tests/ui/PlayingHost.bake-gate.test.ts`.

---

## 2. `R-25` — Silent `recordFrame` catch · **FIXED**

- Removed outer `try/catch` around `recordFrame` in `useGameLoop.ts` (failures surface again).
- Glow blit re-enabled via named `GLOW_BLIT_ENABLED = true`.
- Soft-fail **only** around `drawImageRect` (disposed atlas).

---

## 3. `R-26` — `toggleDevLevel` · **FIXED** (via R-24)

- Toggle still clears chrome only; does **not** `setActive(true)` before bake.
- Re-arm path: `levelId` → bake → `fxReady` → gate `retry` + `setActive(true)`.
- Covered by bake-gate source contract test.

---

## 4. `R-27` — `tsc` · **FIXED**

- `GLOW_BLIT_ENABLED` restores null narrowing.
- `asyncStorageStore.ts` write-through: drop dead `parsed.status !== 'ok'` (already narrowed after ok-return).
- `npx tsc --noEmit` clean.

---

## 5. `R-28` — Parallel B1/B2/B3 + C1 · **open process**

Still recommended: commit B1 / B2 / B3 separately; C1 already on `a83fd6c`. Does not block playfield fix.

---

## 6. Verify

```bash
npx tsc --noEmit
npx vitest run tests/ui/PlayingHost.bake-gate.test.ts tests/storage.progress-v2.test.ts
# Device: Play → navy field + bricks + paddle; DEV Lv cycle remounts
```
