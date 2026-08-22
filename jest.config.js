module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  // Sibling git worktrees live under .claude/worktrees — their suites belong to
  // their own checkout and shouldn't run (or fail) from this one.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/worktrees/'],
  // These ship untranspiled ESM; let Babel transform them in tests.
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-svg|react-native-modal|react-native-animatable|@maplibre/maplibre-react-native|@mapbox)/)',
  ],
};
