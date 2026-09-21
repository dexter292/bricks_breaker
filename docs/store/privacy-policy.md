# Privacy Policy — Neon Brick Breaker

**Effective date:** 2026-09-21

**LIVE_URL: OWNER_WAIVED_2026-09-21**

*(Owner instructed Phase 8 to proceed without a live public HTTPS host. In-repo `privacy-policy.html` remains the source of truth. **D-27 / PLT-04 live-URL gate stays OPEN** until a real `https://…` URL is published and verified with `curl -fsSI` — required before any store submit. See `HOSTING.md`.)*

## Overview

Neon Brick Breaker (“the App”) is an offline arcade game. This policy describes how the App handles data for the current MVP build.

## What the App does with data

- **Offline gameplay.** Core play does not require a network connection. The App does not send gameplay state to our servers.
- **Local high score.** A personal-best score may be stored on the device using AsyncStorage (on-device key/value storage). That value stays on the device unless the user clears app data or uninstalls the App. It is not uploaded by the MVP App.
- **No accounts.** The App does not offer sign-in or user profiles.
- **No ads or in-app purchases.** The MVP App does not include advertising SDKs or IAP / store purchase SDKs.
- **No analytics SDKs.** The MVP App does not embed third-party analytics or tracking SDKs.
- **No personally identifiable information** is requested or collected by the MVP App for gameplay.

## Platform and store surfaces

App Store / Play Store pages, OS crash reports, or optional developer tooling outside the App binary may process data under Apple’s or Google’s policies. Those platform practices are separate from the App’s own offline MVP behavior described here.

## Children’s privacy

The App is suitable for a general audience and does not knowingly collect personal information from children.

## Changes

If this policy changes for a future build (for example if networking, ads, or accounts are added), the live HTTPS copy and this in-repo source will be updated.

## Contact

Questions about this policy can be raised via the project’s public repository issues (when published) or the developer contact listed on the store listing when one exists.
