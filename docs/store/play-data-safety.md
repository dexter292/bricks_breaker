# Google Play Data Safety — Neon Brick Breaker

> **Prepared; not used for the iOS-first public release (D2=B, 2026-09-24).** Keep for a future Android return. ASC privacy nutrition is the active store path.

In-repo answers for the Play Console Data Safety form. Reflects the **actual MVP** binary: offline gameplay, local personal best via AsyncStorage, no ads/IAP/accounts/analytics SDKs, platform monetization seams remain no-op.

## Form answers

| Question | Answer |
|----------|--------|
| Does the app collect personal or sensitive user data? | **No** |
| Does the app share user data with third parties? | **No** |
| Is data encrypted in transit? | **N/A for gameplay data** — MVP gameplay does not transmit user data. The public privacy-policy page is served over HTTPS when hosted; that is hosting for the policy document, not encryption of gameplay telemetry (there is none). |
| Can users request data deletion? | **N/A / device control** — on-device high score is cleared by uninstalling the app or clearing app storage. No cloud account data. |
| Ads? | **No** |
| In-app purchases? | **No** |
| Approximate target age | **Everyone** (see `age-rating.md`) |

## On-device high score vs Play “collected” (RESEARCH A3)

**Chosen interpretation for this MVP:** the AsyncStorage personal-best score is **not collected** under Play Data Safety because it is:

1. Stored **only on the device**
2. **Never transmitted** by the App to the developer or third parties
3. Not linked to an account or advertising ID

If Play Console guidance for a future review cycle requires declaring ephemeral local preferences under “App info and performance” or similar, update this file and the live privacy policy together — do not silently diverge.

## Data types checklist (MVP)

| Category | Declared? | Notes |
|----------|-----------|-------|
| Location | No | — |
| Personal info (name, email, etc.) | No | — |
| Financial info | No | No IAP |
| Health / fitness | No | — |
| Messages | No | — |
| Photos / video | No | — |
| Audio files | No | SFX are bundled assets only |
| Files / docs | No | — |
| Calendar / contacts | No | — |
| App activity | No (per A3) | Local score only; not transmitted |
| App info & performance (crash logs via OS) | Platform-only | OS / store crash reporting may apply outside app-declared collection |
| Device or other IDs | No | No analytics / ads SDKs |

## Non-goals

- Creating the Play / ASC listing and clicking submit is an **operator** step — see [`CONSOLE-ENTRY.md`](./CONSOLE-ENTRY.md) for paste-ready answers. In-repo paperwork for Data Safety is complete; console fields remain **not entered** until that checklist is marked YES.
