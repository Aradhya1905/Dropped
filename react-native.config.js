module.exports = {
  project: {
    ios: {},
    android: {},
  },
  // Bundles the Dropped typefaces (Newsreader / Geist / Geist Mono / Caveat).
  // Run `npx react-native-asset` after adding the .ttf files to link them
  // into the native iOS/Android projects.
  assets: ['./assets/fonts/'],
};
