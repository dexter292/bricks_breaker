/**
 * Public display name (N-BRAND-01 / N-BRAND-02).
 *
 * Single source of truth for on-screen branding. `app.config.js` carries the same string
 * for the installed app name and the store listing; `scripts/assert-brand-name.mjs` fails
 * the build if the two drift, and also checks the chosen name recorded in
 * `docs/store/name-clearance.md`.
 *
 * Renaming is display-only: bundle id `com.dexter292.bricksbreaker`, the Expo slug
 * `bricks-breaker` and the URL scheme `bricksbreaker` deliberately stay put.
 */
export const DISPLAY_NAME = 'Pulse Paddle';
