No external API integration: this phase touches only in-repo React Native surfaces and the local on-device `ProgressStore`; zero packages are added and no Expo/SDK/REST/webhook surface is consumed.

<!--
Shortened 2026-09-27 to satisfy the `api-coverage.verify-pre` gate's 200-char
declaration limit (measured 339 before, 197 after). The surfaces the original
line named, unchanged and recorded here rather than dropped:
`app/_components/PlayingHost.tsx`, `src/runtime/GameScreen.tsx`,
`src/runtime/overlays/ResultOverlay.tsx`, plus the local on-device `ProgressStore`.
Round 6 additionally added `app/_components/certLevelPlan.ts` — a pure local
predicate module, no external surface.

Provenance: the `api-coverage.cjs` detector returned `detected: true` on a single signal —
verb `(surface)` + noun `api` matched inside the 11-05 PLAN prose
"No Expo API, no Expo module, no new import from ...". That is a NEGATION of an API
integration, not an integration. Re-read of the phase scope confirms the negative:

- `11-RESEARCH.md` § Package Legitimacy Audit: "Zero packages are added by this phase".
- `11-UI-SPEC.md` § Design System: "This phase needs no new Expo API".
- The only storage surface is `@react-native-async-storage/async-storage` 2.2.0, a local
  device key/value store already shipped in Phase 6 — not an external service.

Per the api-coverage capability's own branch, a reasoned declaration is written in place of a
fabricated capability matrix. The seal-time `api-coverage.verify-pre` gate accepts this form.
-->
