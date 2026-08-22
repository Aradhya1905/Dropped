/**
 * Zustand middleware: mirror every state change into Reactotron's timeline.
 *
 * Prod-safe by design — this file imports no Reactotron package. It reads a
 * global (`__DROPPED_TRON__`) that the dev-only Reactotron config installs at
 * startup. In a release build that global is never set, so this is a thin
 * passthrough with zero cost.
 */
import type { StateCreator } from 'zustand';

type TronDisplay = (config: {
  name: string;
  value?: unknown;
  preview?: string;
  important?: boolean;
}) => void;

const getTron = (): { display: TronDisplay } | undefined =>
  (globalThis as { __DROPPED_TRON__?: { display: TronDisplay } })
    .__DROPPED_TRON__;

export const withReactotron =
  <T>(label: string, config: StateCreator<T>): StateCreator<T> =>
  (set, get, api) =>
    config(
      ((...args: Parameters<typeof set>) => {
        (set as (...a: unknown[]) => void)(...args);
        getTron()?.display({
          name: 'ZUSTAND',
          preview: label,
          value: get(),
          important: true,
        });
      }) as typeof set,
      get,
      api,
    );
