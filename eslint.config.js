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
              from: { element: { type: 'services' } },
              allow: { to: { element: { type: 'services' } } },
            },
          ],
        },
      ],
    },
  },
];
