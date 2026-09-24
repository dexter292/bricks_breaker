# A3 cohort runbook — playtest + D3 + rename pulse

**Status:** Form ready; **cohort NOT RUN** (≥5 first-time players)  
**Authority:** N-QA-02 · D3=C · N-BRAND-01 · `docs/ops/PLAYTEST-FORM-A3.md`

Recruitment has lead time — start now even if ceiling/Sentry still open.

**Device note (2026-09-24):** Release sideload installed on Dexter’s iPhone 16 Pro (`Release-iphoneos`). Unlock phone → open **Neon Brick Breaker** (no Metro). Fill roster in `PLAYTEST-FORM-A3.md`.

---

## 1. Build for testers

Prefer a **sideload Debug or Release** on a trusted device (no Store listing required).

```bash
# Physical iPhone (Debug — Metro optional if already installed)
npx expo run:ios --device

# Or Release sideload (no Metro; good for “real” feel, no Cert/Soak chips)
npx expo run:ios --device --configuration Release
```

Do **not** set `EXPO_PUBLIC_SOAK` / `EXPO_PUBLIC_CERT` for playtest sessions.

Hand the phone to the tester **unlocked**, on Title. You observe; they play.

---

## 2. Session (≈10–15 min)

1. Read script in `PLAYTEST-FORM-A3.md` — no coaching, no “aim” hints.
2. Silent observe 2–3 minutes.
3. Ask Q1–Q4 (Q4 required). Optional Q5–Q6.
4. Fill one roster row immediately.

---

## 3. After each session

Update the **Tally** table in `PLAYTEST-FORM-A3.md` (running counts for Q4).

---

## 4. After ≥5

1. Fill **D3 recommendation** block in the form (majority rules).
2. Paste short notes into `.planning/post-mvp/` or leave in the form.
3. If Q5 reactions cluster on a rename candidate, copy into `docs/store/name-clearance.md` → Chosen display name (owner still signs).

---

## 5. Acceptance for A3

- [ ] ≥5 roster rows with Q4 answered  
- [ ] D3 recommendation written (B0 greenlight / Won’t-Do / split)  
- [ ] N-BRAND-01: either Chosen name filled **or** explicit “still TBD after cohort” note
