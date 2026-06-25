/**
 * Reactotron — dev-only debugging bridge.
 *
 * What's tracked:
 *   • Console logs / warns / errors (built-in to useReactNative)
 *   • Network calls via axios/XHR (built-in networking plugin)
 *   • MMKV storage writes (via onMmkvChange listener below)
 *
 * What's NOT tracked (intentionally removed):
 *   • React Query cache state (reactotron-react-query removed)
 *   • Zustand state changes (withReactotron middleware removed from stores)
 *
 * Connecting (Android): open the Reactotron desktop app, then run
 * `yarn adb-reactotron` so the device can reach the desktop on port 9090.
 */
import Reactotron from 'reactotron-react-native';

import { queryClient } from '../../app/queryClient';
import { useDropsStore } from '../../store';
import { forceTestCrash } from '../analytics';
import { clearAll, getDeviceId, getMmkvRaw, onMmkvChange } from '../storage';

const reactotron = Reactotron.configure({ name: 'Dropped' })
  .useReactNative({
    asyncStorage: false,
    networking: {
      // Keep map tiles, glyph fonts and symbolicate noise out of the timeline.
      ignoreUrls: /symbolicate|\.(png|jpg|jpeg|pbf|mvt|pmtiles|ttf|otf)(\?|$)/,
    },
  })
  .connect();

// Fresh log on every Metro reload.
reactotron.clear?.();

// ── MMKV storage tracking ─────────────────────────────────────────────────────

onMmkvChange(key => {
  const raw = getMmkvRaw(key);
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      value = raw;
    }
  }
  reactotron.display({
    name: 'MMKV',
    preview: key,
    value: { key, value },
  });
});

// ── Global access ─────────────────────────────────────────────────────────────

// Expose the instance so you can call `console.tron.log(...)` anywhere in debug.
(globalThis as { __DROPPED_TRON__?: unknown }).__DROPPED_TRON__ = reactotron;
(console as { tron?: unknown }).tron = reactotron;

// ── Custom commands ───────────────────────────────────────────────────────────

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
