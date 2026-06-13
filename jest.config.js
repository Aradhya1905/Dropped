module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  // These ship untranspiled ESM; let Babel transform them in tests.
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-svg|@maplibre/maplibre-react-native|@mapbox)/)',
  ],
};
