// eslint.config.js — ARCH-01 / D-11 / D-14 layer enforcement
// Each rule cites a docs/layer-contract.md row (LC-*).
const expoFlat = require('eslint-config-expo/flat');
const boundaries = require('eslint-plugin-boundaries');

const FORBIDDEN_IN_CORE = [
  'react',
  'react/*',
  'react-dom',
  'react-native',
  'react-native/*',
  'react-native-*',
  '@shopify/react-native-skia',
  '@shopify/react-native-skia/*',
  'expo',
  'expo-*',
  'expo/*',
  '@react-native/*',
  '@react-native-*/*',
];

module.exports = [
  ...expoFlat,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'android/**',
      'ios/**',
      'coverage/**',
      'scripts/fixtures/**',
    ],
  },
  {
    // LC-01 / LC-06: core/ stays pure TypeScript (D-11)
    // D-13 / PHYS-06: no Math.random / wall-clock in core/
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: FORBIDDEN_IN_CORE,
              message:
                'LC-01/LC-06: core/ must stay pure TypeScript — no React, React Native, Skia, Reanimated, or Expo imports (ARCH-01, D-11).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'performance',
          message: 'D-13 / PHYS-06: no wall-clock in core/ — use seeded PRNG streams and FIXED_DT only.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message:
            'D-13: use World mulberry32 streams, not Math.random()',
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'D-13: no Date.now() in core/',
        },
        {
          selector:
            "CallExpression[callee.object.name='performance'][callee.property.name='now']",
          message: 'D-13: no performance.now() in core/',
        },
      ],
    },
  },
  {
    // LC-15 / LC-17: levelgen/ is a JS cold path and stays pure TypeScript (CONTEXT constraint 3)
    // N-GEN-01: no ambient input, and no implementation-approximated Math, in levelgen/
    files: ['src/levelgen/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: FORBIDDEN_IN_CORE,
              message:
                'N-GEN-01/LC-17: levelgen/ must stay pure TypeScript — no React, React Native, Skia, Reanimated, or Expo imports (ARCH-01).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'performance',
          message:
            'N-GEN-01: no wall-clock in levelgen/ — a board must depend on (seed, difficulty) alone.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message:
            'N-GEN-01: use the seeded makeRng stream, not Math.random() — generation must be reproducible from the seed alone.',
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message:
            'N-GEN-01: no Date.now() in levelgen/ — ambient input breaks seed reproducibility.',
        },
        {
          selector:
            "CallExpression[callee.object.name='performance'][callee.property.name='now']",
          message:
            'N-GEN-01: no performance.now() in levelgen/ — ambient input breaks seed reproducibility.',
        },
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='pow']",
          message:
            'N-GEN-01: Math.pow is implementation-approximated — engines may differ in the last bit, which can cross a Math.floor boundary and change a brick count. Use integer lerps.',
        },
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='sin']",
          message:
            'N-GEN-01: Math.sin is implementation-approximated — engines may differ in the last bit, which can cross a Math.floor boundary and change a brick count. Use integer lerps.',
        },
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='cos']",
          message:
            'N-GEN-01: Math.cos is implementation-approximated — engines may differ in the last bit, which can cross a Math.floor boundary and change a brick count. Use integer lerps.',
        },
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='exp']",
          message:
            'N-GEN-01: Math.exp is implementation-approximated — engines may differ in the last bit, which can cross a Math.floor boundary and change a brick count. Use integer lerps.',
        },
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='log']",
          message:
            'N-GEN-01: Math.log is implementation-approximated — engines may differ in the last bit, which can cross a Math.floor boundary and change a brick count. Use integer lerps.',
        },
        {
          selector: "BinaryExpression[operator='**']",
          message:
            'N-GEN-01: the ** operator is implementation-approximated — engines may differ in the last bit, which can change a generated board across Node and Hermes. Use integer arithmetic.',
        },
      ],
    },
  },
  {
    // N-ACH-01 / D-03 / D-20: the achievement catalog and evaluator are a pure function of
    // (catalog, snapshot, unlocked set). No clock, no RNG, no storage import.
    //
    // D-03 is what makes SC-2's "evaluating the same snapshot twice yields the same set"
    // testable WITHOUT a harness — a clock or an RNG read anywhere in this directory makes
    // that claim untestable, not merely untidy. D-20 is the other half: no
    // `src/services/<mode>/` module has ever imported a storage type, and the evaluator
    // declares its own structurally-compatible read-only view instead (verified to compile
    // with zero `tsc` errors). A storage import here would also put a value-level edge
    // into a module `parseBlob.ts` imports in plan 13-03, which is a cycle.
    //
    // Comments are not AST nodes, so — exactly as for the `src/services/daily/` block
    // below, which this copies in shape — `catalog.ts` and `evaluate.ts` may NAME all four
    // banned constructs in prose to explain the ban without self-invalidating it. MEASURED:
    // a probe file carrying all five violations plus a header naming every one of them
    // draws exactly 5 errors, none of them from the comment.
    //
    // **This block's own presence is NOT observed by `npm run lint`.** Measured on this
    // tree: `npm run lint` and `npx eslint src/services/achievements/` both exit 0 against
    // a clean directory whether or not this block is configured, so a green lint is no
    // evidence it exists. The `__purity_probe` gate in plan 13-01's verify block is the one
    // command whose output moves with it — 5 errors with the block, 0 without, run in both
    // directions. A named control that nothing observes is the defect this repo has now
    // shipped four times.
    files: ['src/services/achievements/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/storage', '**/storage/*', '../storage', '../storage/*'],
              message:
                'D-20: the achievement policy imports NO storage type — it declares its own structurally-compatible read-only snapshot view (`AchievementSnapshot`), checked by the compiler at each store call site. Importing storage here makes every catalog test need a storage harness, which is exactly what makes N-ACH-01\'s "pure predicate" untestable.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.name='Date'][property.name='now']",
          message:
            'D-03: the evaluator is a pure function of its arguments. The unlock timestamp is read in the STORE, beside the `updatedAt = Date.now()` it already does (D-14) — a clock read here would make SC-2 untestable without a harness.',
        },
        {
          selector: "NewExpression[callee.name='Date']",
          message:
            'D-03: no clock construction in the achievement policy. A predicate that depends on when it runs is not a pure function of the snapshot, and SC-2 asserts exactly that it is.',
        },
        {
          selector:
            "MemberExpression[object.name='Math'][property.name='random']",
          message:
            'D-03: no randomness in the achievement policy. SC-2 requires the same snapshot to yield the same set every time it is evaluated.',
        },
        {
          selector:
            "MemberExpression[object.name='performance'][property.name='now']",
          message:
            'D-03: `performance.now` is a clock read like any other — same reason as `Date.now` above, and it is the one a later reader reaches for when the obvious clock is banned.',
        },
      ],
    },
  },
  {
    // N-DAILY-01 / SC-1: the local date key must not come from a locale, from UTC, or from
    // a fixed-length day. Each of the three was MEASURED producing a wrong answer, not
    // merely suspected (12-RESEARCH § Findings 2, 3(c), 3(e)), and each failure is
    // INVISIBLE on an en-US simulator in a UTC-adjacent zone — which is why the ban needs a
    // standing gate rather than a review habit. Plan 12-01 ran this as a one-shot grep in a
    // verify block; nothing re-ran it, so it lives here now, beside the src/core and
    // src/levelgen blocks above that it copies in shape.
    //
    // Comments are not AST nodes, so unlike a grep this needs no comment-stripping step:
    // `streak.ts` may name `86_400_000` in prose to explain why it is wrong, and
    // `tests/daily.date-key.test.ts` may hold the banned step as a control the real
    // function must differ from — tests are outside these `files` anyway.
    files: ['src/services/daily/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'Intl',
          message:
            'N-DAILY-01: ECMA-402 gave five different keys across five device locales under this project\'s own Hermes — a Thai and a US device would draw different boards on the same date (SC-1).',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='Intl']",
          message:
            'N-DAILY-01: no ECMA-402 anywhere in the daily date policy — the key must be the same string on every device.',
        },
        {
          selector: "CallExpression[callee.property.name=/^toLocale/]",
          message:
            'N-DAILY-01: no locale-formatting Date method — it resolves through the platform locale data and is a different calendar entirely in Bangkok.',
        },
        {
          selector: "CallExpression[callee.property.name='toISOString']",
          message:
            'N-DAILY-01: UTC serialisation is a calendar day wrong for a third of every day in Santiago — use the local-field derivation in dateKey.ts.',
        },
        {
          selector: 'Literal[value=86400000]',
          message:
            'N-DAILY-01: a local day is 23 or 25 hours on a DST boundary — a fixed-day step SKIPS 2026-09-06 in Santiago and REPEATS 2026-11-01 in Havana. Step the day through the local-field Date constructor, never by a fixed duration.',
        },
      ],
    },
  },
  {
    // LC-07: no cross-runtime hops on the per-frame hot path (D-14)
    files: [
      'src/runtime/**/*.{ts,tsx}',
      'src/render/**/*.{ts,tsx}',
      'app/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='runOnJS']",
          message:
            'LC-07: No runOnJS on the per-frame hot path (D-14).',
        },
        {
          selector: "CallExpression[callee.property.name='runOnJS']",
          message:
            'LC-07: No runOnJS (member call) on the per-frame hot path (D-14).',
        },
        {
          selector: "CallExpression[callee.name='scheduleOnRN']",
          message:
            'LC-07: No scheduleOnRN on the per-frame hot path (D-14).',
        },
        {
          selector: "CallExpression[callee.property.name='scheduleOnRN']",
          message:
            'LC-07: No scheduleOnRN (member call) on the per-frame hot path (D-14).',
        },
      ],
    },
  },
  {
    // LC-07 Phase 7 exception: ≤1 batched scheduleOnRN/frame from eventBridge for audio drain
    files: ['src/runtime/eventBridge.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // LC-07 chrome bridge: allow batched runOnJS from PlayingHost reactions only;
    // scheduleOnRN stays forbidden (audio drain remains eventBridge-only).
    files: ['app/_components/PlayingHost.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='scheduleOnRN']",
          message:
            'LC-07: No scheduleOnRN on the per-frame hot path (D-14). Use eventBridge for audio drain.',
        },
        {
          selector: "CallExpression[callee.property.name='scheduleOnRN']",
          message:
            'LC-07: No scheduleOnRN (member call) on the per-frame hot path (D-14).',
        },
      ],
    },
  },
  {
    // LC-02..LC-05, LC-08: one-way layer matrix (eslint-plugin-boundaries)
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'core', pattern: 'src/core/**' },
        { type: 'runtime', pattern: 'src/runtime/**' },
        { type: 'render', pattern: 'src/render/**' },
        { type: 'app', pattern: 'app/**' },
        { type: 'input', pattern: 'src/input/**' },
        { type: 'vfx', pattern: 'src/vfx/**' },
        { type: 'services', pattern: 'src/services/**' },
        { type: 'levelgen', pattern: 'src/levelgen/**' },
      ],
      // Single-file flags — element descriptors match folders; use file category (NF-16).
      'boundaries/files': [
        { category: 'devflags', pattern: 'src/devflags.ts' },
      ],
    },
    rules: {
      ...boundaries.configs.recommended.rules,
      // LC-02 runtime→core; LC-03 render→core (read); LC-04 app→runtime/render;
      // LC-05 input→runtime; LC-08 core must not import other layers
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'core' } },
              allow: { to: { element: { type: 'core' } } },
            },
            {
              // LC-02 runtime→core; LC-12 runtime→render; LC-13 runtime→vfx
              from: { element: { type: 'runtime' } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['core', 'runtime', 'render', 'vfx'] },
                  },
                },
              },
            },
            {
              // LC-03 render→core; LC-14 render→vfx
              from: { element: { type: 'render' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['core', 'render', 'vfx'] } },
                },
              },
            },
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        'runtime',
                        'render',
                        'input',
                        'app',
                        'services',
                        'levelgen',
                      ],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: 'app' } },
              allow: {
                to: { file: { categories: 'devflags' } },
              },
            },
            {
              from: { element: { type: 'input' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['runtime', 'input'] } },
                },
              },
            },
            {
              from: { element: { type: 'vfx' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['vfx', 'render', 'core'] } },
                },
              },
            },
            {
              // Services may use core domain types (e.g. LevelId) — never runtime.
              // LC-16: services may also read the levelgen barrel.
              from: { element: { type: 'services' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['services', 'core', 'levelgen'] } },
                },
              },
            },
            {
              // LC-15: levelgen -> core only (schema/validate/solvability types).
              // LC-17: never runtime, render, input, vfx or services — generation is a
              // JS cold path that runs once per board, never per frame.
              from: { element: { type: 'levelgen' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['levelgen', 'core'] } },
                },
              },
            },
          ],
        },
      ],
    },
  },
];
