# A3 playtest form — first-time players (N-QA-02)

**Goal:** ≥5 first-time players. Start recruiting **now** (lead time); run sessions when a build is ready.  
**Also collects:** display-name reactions (feeds N-BRAND-01) and **D3 serve-agency** data.  
**Operator runbook:** [`A3-COHORT-RUNBOOK.md`](./A3-COHORT-RUNBOOK.md)

## Script (read aloud / show)

1. Install build (TestFlight or sideload). No coaching beyond “play a few minutes.”
2. Observe first 2–3 minutes silently.
3. Ask the questions below. Do **not** hint that aim exists or should exist.

## Required questions

| # | Question | Answers |
|---|----------|---------|
| Q1 | Controls clarity: within ~30s, did you understand how to move the paddle? | yes / partial / no |
| Q2 | Desire to replay: after one run, do you want to try again? | yes / maybe / no |
| Q3 | Pain points: what frustrated you most? (free text) | — |
| **Q4 (D3)** | **Khi bóng gắn vào paddle đầu mỗi lượt, bạn có muốn điều khiển hướng phóng không?** | **có / không / không để ý** |

Q4 must not be skipped. **“không để ý” is decisive** for Won’t-Do vs implement.

## Optional

| # | Question |
|---|----------|
| Q5 | Any reaction to the name “Neon Brick Breaker”? Confusion with other apps? Prefer one of: **Pulse Paddle**, **Grid Ricochet**, **Lumen Break**, or another short name? |
| Q6 | Approximate clear time / lives left (if they finished) |

Name shortlist for Q5 (avoid exact “Neon Brick Breaker” — ASC collision; see `docs/store/name-clearance.md`):

1. **Pulse Paddle**  
2. **Grid Ricochet**  
3. **Lumen Break**  
4. Owner write-in

## Roster (fill as you recruit)

| # | Initials / alias | Date | Q1 | Q2 | Q4 | Q5 name pulse | Notes |
|---|------------------|------|----|----|-----|----------------|-------|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |

## Running tally (update after each session)

| Metric | Count |
|--------|------:|
| Sessions complete | 0 / 5 |
| Q4 **có** | 0 |
| Q4 **không** | 0 |
| Q4 **không để ý** | 0 |
| Q1 clarity = yes | 0 |
| Q2 replay = yes | 0 |

## After ≥5 — D3 recommendation

Write here (date + initials):

| Field | Value |
|-------|--------|
| Date | |
| Q4 majority | có / không / không để ý / split |
| **Recommendation** | B0 greenlight / Won’t-Do PHYS-05 aimed / defer + more cohort |
| Rationale (2–3 sentences) | |
| Rename pulse (optional) | Top write-in / shortlist pick → copy to `name-clearance.md` when owner confirms |

Rules of thumb:

- Majority **có** → greenlight Phase B0  
- Majority **không để ý** or **không** → Won’t-Do PHYS-05 aimed (close debt honestly)  
- Split → defer to G or more cohort
