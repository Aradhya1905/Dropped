const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaults = getDefaultConfig(__dirname);

// Metro accepts a RegExp or an array of them; keep whatever the defaults already block.
const defaultBlockList = [].concat(defaults.resolver.blockList ?? []);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * `maxWorkers` and `blockList` keep Metro's CPU use down: fewer parallel
 * transform workers, and native build output / Pods / .git are never crawled
 * or watched (Gradle writing into android/build otherwise triggers re-crawls).
 * Paths use [\\/] so the patterns match on Windows as well as macOS/Linux.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  maxWorkers: 2,
  resolver: {
    blockList: [
      ...defaultBlockList,
      /[\\/]android[\\/]build[\\/].*/,
      /[\\/]android[\\/]app[\\/]build[\\/].*/,
      /[\\/]android[\\/]\.gradle[\\/].*/,
      /[\\/]ios[\\/]Pods[\\/].*/,
      /[\\/]ios[\\/]build[\\/].*/,
      /[\\/]\.git[\\/].*/,
    ],
  },
  watcher: {
    healthCheck: { enabled: false },
  },
};

module.exports = mergeConfig(defaults, config);