# Local iOS build (prebuild → pods → run)

**Status:** written 2026-09-25 after the D2 rename forced a native regenerate.

`ios/` is **generated and gitignored** — this is the Expo managed workflow. Anything that
changes native config (`app.config.js` `name`, icons, splash, plugins, permissions) only
reaches the device after a prebuild + rebuild. Editing `ios/` by hand is not durable.

## The sequence

```bash
npx expo prebuild -p ios
cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install && cd ..
SENTRY_DISABLE_AUTO_UPLOAD=true npx expo run:ios --device "<simulator UDID>"
```

`xcrun simctl list devices booted` gives the UDID. Both env vars are required — see below.

## The Sentry trap

**`expo run:ios` fails with `error: An organization ID or slug is required (provide with
--org)` unless `SENTRY_DISABLE_AUTO_UPLOAD=true` is set.** xcodebuild exits 65 and reports
"3 error(s)"; the real cause is the *Upload Debug Symbols to Sentry* build phase.

N-OPS-01 wired `@sentry/react-native` but the owner deferred provisioning the Sentry
project, so there is no org/project for the CLI to upload to
(see [`CRASH-REPORTING.md`](./CRASH-REPORTING.md)).

All three **EAS** profiles already set this var in `eas.json` — the gap is only the local
`expo run:ios` path, which does not read `eas.json`. Once an org is provisioned and the
plugin gets `organization` + `project`, the var stops being necessary.

## The locale trap

**`pod install` fails on this machine unless `LANG` / `LC_ALL` are set to a UTF-8 locale.**
With them unset, CocoaPods 1.16.2 on Ruby 4.0.4 dies inside `Pod::Config#installation_root`:

```
Unicode Normalization not appropriate for ASCII-8BIT (Encoding::CompatibilityError)
```

It is not a project error and the message does not point at the cause. `npx expo prebuild`
runs `pod install` for you, so the same crash appears at the end of a prebuild — note that
prebuild has *already regenerated `ios/` successfully* at that point, so you only need to
rerun `pod install`, not the whole prebuild.

## What a rename touches

The D2 rename (`Neon Brick Breaker` → `Pulse Paddle`) moved more than a string:

| Artefact | Effect |
|----------|--------|
| `ios/<Name>/`, `ios/<Name>.xcodeproj` | directory and project **renamed** by prebuild |
| `Info.plist` `CFBundleDisplayName` | regenerated from `app.config.js` `name` |
| `Images.xcassets/AppIcon.appiconset` | re-imported from `assets/images/icon.png` |
| DerivedData | old `NeonBrickBreaker-*` folder is stale; a fresh one is created |
| Bundle id / slug / scheme | **unchanged** — display-only rename by design |

So a stale simulator install keeps the old name and icon until you rebuild. JS and asset
changes (levels, gameplay, Title text) do *not* need this — Metro serves those live.

## Regenerating the brand icons

`npm run gen:icons` rewrites `assets/images/*` procedurally (see
[`LEVEL-VERBS-E1b.md`](./LEVEL-VERBS-E1b.md) for the wider D-phase context and
`scripts/gen-brand-icons.mjs` for the mark itself). Run it **before** prebuild so the new
art is picked up into the asset catalog.
