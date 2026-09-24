# Privacy Policy — Neon Brick Breaker

**Effective date:** 2026-09-21

LIVE_URL: https://dexter292.github.io/bricks_breaker/store/privacy-policy.html

Published via GitHub Pages — source branch `main`, folder `/docs`. In-repo HTML is the source of truth.

## Overview

Neon Brick Breaker (“the App”) is an offline arcade game. This policy describes how the App handles data for the current MVP build.

## What the App does with data

- **Offline gameplay.** Core play does not require a network connection. The App does not send gameplay state to our servers.
- **Local high score.** A personal-best score may be stored on the device using AsyncStorage (on-device key/value storage). That value stays on the device unless the user clears app data or uninstalls the App. It is not uploaded by the MVP App.
- **No accounts.** The App does not offer sign-in or user profiles.
- **No ads or in-app purchases.** The App does not include advertising SDKs or IAP / store purchase SDKs.
- **No analytics / tracking SDKs.** The App does not embed third-party analytics or advertising attribution SDKs.
- **Optional crash reporting.** When enabled for a given build (Sentry via environment configuration), the App may send crash/error reports (stack traces, device model/OS, app version) to help fix defects. Crash reporting is **off** unless that build is configured with a reporting endpoint. Gameplay scores and paddle input are not uploaded for analytics.
- **No personally identifiable information** is requested for gameplay. Crash reports do not intentionally include your name or email.

## Platform and store surfaces

App Store / Play Store pages, OS crash reports, or optional developer tooling outside the App binary may process data under Apple’s or Google’s policies. Those platform practices are separate from the App’s own offline MVP behavior described here.

## Children’s privacy

The App is suitable for a general audience and does not knowingly collect personal information from children.

## Changes

If this policy changes for a future build (for example if networking, ads, or accounts are added), the live HTTPS copy and this in-repo source will be updated.

## Contact

Questions about this policy or the App:

- **Email (no GitHub account required):** [dexter@lkfnb.com](mailto:dexter@lkfnb.com)
- GitHub Discussions: https://github.com/dexter292/bricks_breaker/discussions
- Maintainer profile: https://github.com/dexter292

See also `SECURITY.md` at the repository root for vulnerability reporting.
