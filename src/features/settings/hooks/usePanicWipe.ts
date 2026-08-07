/**
 * usePanicWipe — "can I make this go away?", answered.
 *
 * Two rules, and both of them are the feature:
 *
 * 1. **The server goes first.** Local data is destroyed only after
 *    `DELETE /devices/me` has answered 200. A local wipe on top of a failed call
 *    leaves someone believing their confessions are gone while they are still on
 *    the map — the worst outcome available here, and the one a naive
 *    fire-and-forget produces on every flaky connection.
 * 2. **Name what survives.** Drops and replies are anonymised, not deleted: a
 *    confession somebody already walked to stays where it was left, now with no
 *    author linkage at all. The receipt carries those numbers so the
 *    confirmation can say so instead of promising a disappearance the app can't
 *    deliver.
 */
import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { ApiEraseReceipt } from '../../../services/api';
import { clearAll, rotateDeviceId } from '../../../services/storage';
import { useDropsStore } from '../../../store/dropsStore';
import { eraseThisDevice } from '../api';

export interface WipeDeps {
  erase: () => Promise<ApiEraseReceipt>;
  /** Destroy every local trace. Must not run before `erase` resolves. */
  clearLocal: () => void;
  /** Retire the anonymous identity. Must run *after* `clearLocal`. */
  rotate: () => string;
}

/**
 * The wipe itself, free of React so the ordering can be asserted directly.
 *
 * The `await` is load-bearing: if `erase()` rejects, this throws before a single
 * local byte is touched and the device is exactly as it was.
 */
export async function runWipe(deps: WipeDeps): Promise<ApiEraseReceipt> {
  const receipt = await deps.erase();
  // Order matters in the other direction too: `clearLocal` wipes MMKV whole, so
  // an id minted before it would be erased along with everything else.
  deps.clearLocal();
  deps.rotate();
  return receipt;
}

/**
 * A single-flight wrapper. A double-tap on a destructive confirm must send one
 * request, not two — the endpoint is idempotent so a second call is survivable,
 * but "survivable" is not the bar for the one button that can't be undone.
 */
export function createWipeRunner(deps: WipeDeps): () => Promise<ApiEraseReceipt> {
  let inFlight: Promise<ApiEraseReceipt> | null = null;
  return () => {
    if (inFlight) return inFlight;
    inFlight = runWipe(deps).finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}

/**
 * Where the user is in the two-step confirm.
 *
 * - `idle`    — the row is just a row.
 * - `armed`   — step one taken; the dialog is open, naming what dies.
 * - `wiping`  — the request is out. Nothing local has been touched yet.
 * - `done`    — erased. `receipt` says what happened.
 * - `failed`  — nothing happened, anywhere. `error` says why.
 */
export type WipeStage = 'idle' | 'armed' | 'wiping' | 'done' | 'failed';

export interface UsePanicWipeResult {
  stage: WipeStage;
  receipt: ApiEraseReceipt | null;
  error: string | null;
  /** Step one: open the confirm. */
  arm: () => void;
  /** Back out — from the confirm, or from a failure. */
  cancel: () => void;
  /** Step two: actually do it. */
  confirm: () => void;
}

export function usePanicWipe(): UsePanicWipeResult {
  const [stage, setStage] = useState<WipeStage>('idle');
  const [receipt, setReceipt] = useState<ApiEraseReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const clearDrops = useDropsStore(s => s.clearDrops);

  const run = useMemo(
    () =>
      createWipeRunner({
        erase: eraseThisDevice,
        // Disk is only half of it: the react-query cache and the drops store
        // both hold the erased device's secrets in memory, and a screen reading
        // from either would keep showing them after the wipe.
        clearLocal: () => {
          clearAll();
          queryClient.clear();
          clearDrops();
        },
        rotate: rotateDeviceId,
      }),
    [queryClient, clearDrops],
  );

  const arm = useCallback(() => {
    setError(null);
    setStage('armed');
  }, []);

  const cancel = useCallback(() => {
    setError(null);
    setStage('idle');
  }, []);

  const confirm = useCallback(() => {
    setStage('wiping');
    setError(null);
    run()
      .then(result => {
        setReceipt(result);
        setStage('done');
      })
      .catch((e: { message?: string }) => {
        // Say plainly that nothing happened. Someone who just pressed "erase
        // everything" and saw an error needs to know whether they are half-way
        // through a wipe — they are not.
        setError(e?.message ?? 'Something went wrong.');
        setStage('failed');
      });
  }, [run]);

  return { stage, receipt, error, arm, cancel, confirm };
}
