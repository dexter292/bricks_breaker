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
    },
  },
  {
    // LC-07: no cross-runtime hops on the per-frame hot path (D-14)
    files: ['src/runtime/**/*.{ts,tsx}', 'src/render/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='runOnJS']",
          message:
            'LC-07: No runOnJS on the per-frame hot path (D-14).',
        },
        {
          selector: "CallExpression[callee.name='scheduleOnRN']",
          message:
            'LC-07: No scheduleOnRN on the per-frame hot path (D-14).',
        },
      ],
    },
  },
  {
    // LC-02..LC-05, LC-08: one-way layer matrix (eslint-plugin-boundaries)
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'core', pattern: 'src/core/*' },
        { type: 'runtime', pattern: 'src/runtime/*' },
        { type: 'render', pattern: 'src/render/*' },
        { type: 'app', pattern: 'app/*' },
        { type: 'input', pattern: 'src/input/*' },
        { type: 'ui', pattern: 'src/ui/*' },
        { type: 'vfx', pattern: 'src/vfx/*' },
        { type: 'services', pattern: 'src/services/*' },
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
              // LC-02 runtime→core; LC-12 runtime→render (SkPicture record on hot path)
              from: { element: { type: 'runtime' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['core', 'runtime', 'render'] } },
                },
              },
            },
            {
              from: { element: { type: 'render' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['core', 'render'] } },
                },
              },
            },
            {
              from: { element: { type: 'app' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ['runtime', 'render', 'input', 'ui', 'app'],
                    },
                  },
                },
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
              from: { element: { type: 'ui' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['ui', 'services'] } },
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
