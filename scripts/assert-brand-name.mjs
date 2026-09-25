/**
 * N-BRAND-01 / N-BRAND-02 guard: the public display name must agree everywhere.
 *
 * Checks that the same string appears in:
 *   - app/_brand.ts            DISPLAY_NAME  (on-screen brand)
 *   - app.config.js            name          (installed app + store listing)
 *   - docs/store/name-clearance.md           Chosen display name (the cleared string)
 *
 * The ASC listing collided with an existing product under the old name, so a silent drift
 * between the shipped binary and the cleared string is a submission risk, not a typo.
 * Exit 1 on any mismatch.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function fail(msg) {
  console.error(`assert-brand-name: ${msg}`);
  process.exit(1);
}

const brandSrc = read('app/_brand.ts');
const brandMatch = brandSrc.match(/export const DISPLAY_NAME\s*=\s*'([^']+)'/);
if (!brandMatch) {
  fail('could not find DISPLAY_NAME in app/_brand.ts');
}
const displayName = brandMatch[1];

const configSrc = read('app.config.js');
const configMatch = configSrc.match(/^\s*name:\s*'([^']+)',$/m);
if (!configMatch) {
  fail("could not find top-level `name:` in app.config.js");
}
if (configMatch[1] !== displayName) {
  fail(
    `app.config.js name '${configMatch[1]}' !== app/_brand.ts DISPLAY_NAME '${displayName}'`,
  );
}

const clearanceSrc = read('docs/store/name-clearance.md');
const chosenMatch = clearanceSrc.match(
  /\|\s*\*\*Chosen display name\*\*\s*\|\s*([^|]+?)\s*\|/,
);
if (!chosenMatch) {
  fail('could not find "Chosen display name" row in docs/store/name-clearance.md');
}
const chosen = chosenMatch[1].replace(/\*\*/g, '').trim();
if (chosen !== displayName) {
  fail(
    `name-clearance chosen name '${chosen}' !== DISPLAY_NAME '${displayName}' — clear the new string before shipping it`,
  );
}

// The old name collided on ASC; make sure it is gone from shipped surfaces.
const BANNED = 'Neon Brick Breaker';
for (const rel of ['app.config.js', 'app/_brand.ts']) {
  if (read(rel).includes(BANNED)) {
    fail(`${rel} still contains the collided name '${BANNED}'`);
  }
}

console.log(`assert-brand-name: OK ('${displayName}' consistent; old name absent)`);
process.exit(0);
