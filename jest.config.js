module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  // Git worktrees live under .claude/worktrees/ and are full checkouts, so
  // without this every spec runs twice — once here and once from whatever
  // branch a worktree happens to be parked on, against that worktree's own
  // (possibly stale) node_modules. Their results are noise at best and
  // confusing failures at worst.
  testPathIgnorePatterns: ['/node_modules/', '/\\.claude/worktrees/'],
  modulePathIgnorePatterns: ['/\\.claude/worktrees/'],
  // These ship untranspiled ESM; let Babel transform them in tests.
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-firebase|@react-navigation|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-svg|react-native-modal|react-native-animatable|@maplibre/maplibre-react-native|@mapbox)/)',
  ],
};
