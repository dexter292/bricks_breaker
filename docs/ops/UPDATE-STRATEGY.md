# Post-ship update strategy (N-OPS-02)

**Status:** **LOCKED — resubmit-only**  
**Date:** 2026-09-24  
**Owner:** Dexter  
**Gate:** Must before **G2** (`RELEASE-GATES` G2.14)

## Decision

For the **first public iOS release**, post-ship fixes use **App Store resubmit only**.

| Option | Chosen? | Notes |
|--------|---------|-------|
| OTA via `expo-updates` + `runtimeVersion` | **No** | Adds update channel, native config, and review complexity before first listing |
| **Resubmit binary + wait for ASC review** | **Yes** | Explicit; matches D5=A low-surface first submit |

## Implications

- A physics / crash regression after launch requires a **new binary** and ASC review latency (often days).
- Prefer strong G1/G2 soak + Cert WC before submit.
- Revisit OTA after first approval if hotfix latency becomes a product problem — would be a new ops decision, not silent scope creep.

## Not in scope of this decision

- Implementing `expo-updates`
- Android Play tracks (D2=B deferred)
