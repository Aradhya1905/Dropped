/**
 * Reactotron — dev-only debugging bridge to the Reactotron desktop app.
 *
 * Wired up in `index.js` behind an `if (__DEV__) require(...)`, so this file and
 * its devDependencies are dead-code-eliminated from release bundles. Gives us:
 *   • a network timeline (all axios/XHR traffic),
 *   • a React Query cache + query inspector (`reactotron-react-query`),
 *   • a Zustand state timeline (see `store/withReactotron.ts`),
 *   • Dropped-specific custom commands (buttons in the Reactotron sidebar).
 *
 * Connecting (Android): open the Reactotron desktop app, then run
 * `yarn adb-reactotron` so the device can reach the desktop on port 9090.
 */
import Reactotron from 'reactotron-react-native';
import {
  QueryClientManager,
  reactotronReactQuery,
} from 'reactotron-react-query';

import { queryClient } from '../../app/queryClient';
import { useDropsStore } from '../../store';
import { forceTestCrash } from '../analytics';
import { clearAll, getDeviceId } from '../storage';

const queryClientManager = new QueryClientManager({ queryClient });

const reactotron = Reactotron.configure({
  name: 'Dropped',
  onDisconnect: () => queryClientManager.unsubscribe(),
})
  .useReactNative({
    // MMKV is our storage, not AsyncStorage — don't load that plugin.
    asyncStorage: false,
    networking: {
      // Keep map tiles, glyph fonts and symbolicate noise out of the timeline.
      ignoreUrls: /symbolicate|\.(png|jpg|jpeg|pbf|mvt|pmtiles|ttf|otf)(\?|$)/,
    },
  })
  .use(reactotronReactQuery(queryClientManager))
  .connect();

// Fresh log on every Metro reload.
reactotron.clear?.();

// Expose the instance: the Zustand middleware reads this global, and it lets you
// poke `console.tron.log(...)` from anywhere while debugging.
(globalThis as { __DROPPED_TRON__?: unknown }).__DROPPED_TRON__ = reactotron;
(console as { tron?: unknown }).tron = reactotron;

// ── Dropped-specific custom commands ─────────────────────────────────────────

reactotron.onCustomCommand({
  command: 'Log device id',
  description: 'Print the anonymous X-Device-Id this build sends to the backend',
  handler: () =>
    reactotron.display({
      name: 'DEVICE ID',
      value: getDeviceId(),
      important: true,
    }),
});

reactotron.onCustomCommand({
  command: 'Dump drops store',
  description: 'Show the current Zustand drops state',
  handler: () =>
    reactotron.display({
      name: 'DROPS STORE',
      value: useDropsStore.getState().drops,
      preview: `${useDropsStore.getState().drops.length} drops`,
    }),
});

reactotron.onCustomCommand({
  command: 'Clear React Query cache',
  description: 'queryClient.clear() — drop all cached queries',
  handler: () => {
    queryClient.clear();
    reactotron.display({
      name: 'REACT QUERY',
      value: 'cache cleared',
      important: true,
    });
  },
});

reactotron.onCustomCommand({
  command: 'Wipe local storage',
  description: 'MMKV clearAll() — resets onboarding, saved/seen caches, settings',
  handler: () => {
    clearAll();
    reactotron.display({
      name: 'STORAGE',
      value: 'MMKV wiped — reload the app to re-seed',
      important: true,
    });
  },
});

reactotron.onCustomCommand({
  command: 'Force test crash',
  description: 'Trigger a native crash to verify the Crashlytics pipeline',
  handler: () => forceTestCrash(),
});

export default reactotron;
