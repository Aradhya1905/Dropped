/**
 * @format
 */

import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Reactotron (dev only). The __DEV__ guard + require() keeps it and its
// devDependencies out of release bundles (Metro strips the dead branch).
if (__DEV__) {
  require('./src/services/devtools/reactotron');
}

AppRegistry.registerComponent(appName, () => App);
