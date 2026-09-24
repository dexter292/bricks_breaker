# A3 cohort runbook — playtest + D3 + rename pulse

**Status:** Form ready; **cohort 0/5** — Release playtest build on 16 Pro (no CERT/SOAK)  
**Authority:** N-QA-02 · D3=C · N-BRAND-01 · `docs/ops/PLAYTEST-FORM-A3.md`

Recruitment has lead time — start **today**. A1 ceiling is PASS; do not wait on Sentry for cohort sessions.

**Device note (2026-09-24):** Unlock Dexter’s iPhone 16 Pro → open **Neon Brick Breaker** → confirm **Title** (not auto Cert WC). No Metro required.

---

## 0. Day-of operator checklist (≤2 min)

1. Phone unlocked, Do Not Disturb on, brightness mid.  
2. App on **Title** — if playfield auto-starts, rebuild **without** `EXPO_PUBLIC_CERT`.  
3. Clipboard: `PLAYTEST-FORM-A3.md` open on Mac for roster.  
4. Script card (show/read) — **no aim hints**.  
5. After each tester: fill roster row + tally **before** next person.

### Recruit (same day / this week)

| Source | Ask |
|--------|-----|
| Friends / coworkers who never played this build | “10 phút chơi game, hỏi 4 câu — không cần biết game.” |
| Target | **≥5 first-time** players (not you / not prior soak operators) |

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
