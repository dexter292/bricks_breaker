/**
 * D-03 / D-20 guard: the `src/services/achievements/**` purity block must still EXIST.
 *
 * What it observes, and why nothing else can.
 *
 * `eslint.config.js` carries an AST-level block banning `Date.now`, `new Date`,
 * `Math.random`, `performance.now` and any storage import inside
 * `src/services/achievements/`. That block is the ONLY enforcement of D-03's "the evaluator
 * is a pure function of (catalog, snapshot, unlocked set)" — which is in turn what makes
 * SC-2's "the same snapshot twice yields the same set" testable with no harness at all.
 *
 * A green `npm run lint` is NOT evidence the block exists. Measured: lint exits 0 against a
 * clean directory whether the block is configured or deleted, because a clean directory
 * violates nothing either way. So the block can be removed, re-globbed, or have a selector
 * dropped, and every other gate in the tree stays green.
 *
 * This script is the standing observer. It writes a throwaway file that violates all five
 * bans at once, counts the eslint errors, and deletes it. Five is the contract:
 *   0 = the block is gone, or its `files` glob no longer matches this directory
 *   4 = a selector was dropped
 *   5 = correct
 *
 * The probe's header names all five banned constructs in prose on purpose: comments are not
 * AST nodes, so an AST-level rule is immune to being explained. That is the same property
 * `catalog.ts`'s own header relies on, and it is why this check counts eslint errors rather
 * than grepping for the block's text in the config.
 *
 * Provenance: the command lived only inside `13-01-PLAN.md`'s verify block until the
 * phase-13 security audit pointed out that the sole observer of the phase's central purity
 * guarantee had to be reconstructed from a planning artifact — the same gap phase 12's
 * audit left open. Committing it closes that.
 *
 * Exit 1 on any count other than 5, and on a probe file left behind.
 */
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROBE_REL = 'src/services/achievements/__purity_probe.ts';
const PROBE_ABS = join(ROOT, PROBE_REL);
const EXPECTED_ERRORS = 5;

function fail(msg) {
  console.error(`assert-purity: ${msg}`);
  process.exit(1);
}

const PROBE_SOURCE = [
  '/** Prose naming Date.now, new Date, Math.random, performance.now and ../storage/types - comments are not AST nodes. */',
  "import type { TelemetryBlob } from '../storage/types';",
  'export const probe = (b: TelemetryBlob): readonly unknown[] => [b, Date.now(), new Date(), Math.random(), performance.now()];',
  '',
].join('\n');

if (existsSync(PROBE_ABS)) {
  fail(`${PROBE_REL} already exists — refusing to overwrite. A previous run left it behind; delete it and re-run.`);
}

let stdout = '';
try {
  writeFileSync(PROBE_ABS, PROBE_SOURCE, 'utf8');
  try {
    stdout = execFileSync('npx', ['eslint', PROBE_REL], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    // eslint exits non-zero precisely BECAUSE the probe violates the block, which is the
    // outcome this script wants. The output is on stdout either way.
    stdout = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
} finally {
  // Unconditional, and before any assertion below, so a thrown assertion cannot leave the
  // probe in the tree where the next `npm test` would trip the existsSync guard above.
  if (existsSync(PROBE_ABS)) {
    unlinkSync(PROBE_ABS);
  }
}

if (existsSync(PROBE_ABS)) {
  fail(`failed to delete ${PROBE_REL}`);
}

const errorLines = stdout
  .split('\n')
  .filter((l) => /^\s+\d+:\d+\s+error/.test(l));

if (errorLines.length !== EXPECTED_ERRORS) {
  console.error(stdout);
  fail(
    `expected ${EXPECTED_ERRORS} eslint errors from the purity probe, got ${errorLines.length}. ` +
      `0 means the src/services/achievements/** block in eslint.config.js is gone or its files glob no longer matches; ` +
      `4 means a selector was dropped. This block is the ONLY enforcement of D-03/D-20 and a green lint run is not evidence it exists.`,
  );
}

console.log(
  `assert-purity: OK (purity_probe_errors=${errorLines.length} — the src/services/achievements/** block in eslint.config.js bans the clock, RNG and storage imports at AST level; probe written and deleted)`,
);
