module.exports = function (api) {
  api.cache(true);
  return {
    // Disable auto-injection so the worklets plugin runs exactly once, last
    // (duplicate plugin wrapping causes SerializableWorklet abort on device/sim).
    presets: [['babel-preset-expo', { worklets: false, reanimated: false }]],
    plugins: ['react-native-worklets/plugin'],
  };
};
