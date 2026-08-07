/**
 * @format
 */

import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerWalkService } from './src/services/notifications/notifeeAdapter';

// The background walk engine's foreground-service task and background event
// handler. Registered here, at module scope, because notifee runs both in a
// headless JS context with no React tree — registering them from a component
// would mean they don't exist in the one situation they're for: the app closed.
registerWalkService();

// Reactotron (dev only). The __DEV__ guard + require() keeps it and its
// devDependencies out of release bundles (Metro strips the dead branch).
if (__DEV__) {
  require('./src/services/devtools/reactotron');
}

AppRegistry.registerComponent(appName, () => App);
