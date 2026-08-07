import type { ApiEraseReceipt } from '../../../services/api';
import { createWipeRunner, runWipe, type WipeDeps } from './usePanicWipe';

const RECEIPT: ApiEraseReceipt = {
  deleted: { reveals: 4, saves: 2, hearts: 7, reports: 1, stepDays: 30 },
  anonymised: { drops: 3, replies: 5 },
};

/** Deps that record the order they were called in — the whole point here. */
function spyDeps(erase: () => Promise<ApiEraseReceipt>) {
  const calls: string[] = [];
  const deps: WipeDeps = {
    erase: () => {
      calls.push('erase');
      return erase();
    },
    clearLocal: () => {
      calls.push('clearLocal');
    },
    rotate: () => {
      calls.push('rotate');
      return 'new-id';
    },
  };
  return { calls, deps };
}

describe('runWipe', () => {
  it('calls the server first, then wipes, then rotates the id', async () => {
    const { calls, deps } = spyDeps(() => Promise.resolve(RECEIPT));

    await expect(runWipe(deps)).resolves.toEqual(RECEIPT);

    // The order is the feature. A local wipe before the server answers leaves
    // someone believing their confessions are gone while they're on the map.
    expect(calls).toEqual(['erase', 'clearLocal', 'rotate']);
  });

  it('leaves the device untouched when the server call fails', async () => {
    const { calls, deps } = spyDeps(() =>
      Promise.reject({ status: 0, code: 'network', message: 'Network unavailable' }),
    );

    await expect(runWipe(deps)).rejects.toMatchObject({ code: 'network' });

    expect(calls).toEqual(['erase']);
    expect(calls).not.toContain('clearLocal');
    expect(calls).not.toContain('rotate');
  });
});

describe('createWipeRunner', () => {
  it('sends one request for a double-tap on the confirm', async () => {
    let resolve: (r: ApiEraseReceipt) => void = () => {};
    const pending = new Promise<ApiEraseReceipt>(r => {
      resolve = r;
    });
    const { calls, deps } = spyDeps(() => pending);
    const run = createWipeRunner(deps);

    const first = run();
    const second = run();
    resolve(RECEIPT);
    await Promise.all([first, second]);

    expect(calls.filter(c => c === 'erase')).toHaveLength(1);
    expect(calls.filter(c => c === 'clearLocal')).toHaveLength(1);
  });

  it('lets a retry through once the first attempt has settled', async () => {
    let attempt = 0;
    const { calls, deps } = spyDeps(() => {
      attempt += 1;
      return attempt === 1
        ? Promise.reject({ message: 'Network unavailable' })
        : Promise.resolve(RECEIPT);
    });
    const run = createWipeRunner(deps);

    await expect(run()).rejects.toBeDefined();
    await expect(run()).resolves.toEqual(RECEIPT);

    expect(calls).toEqual(['erase', 'erase', 'clearLocal', 'rotate']);
  });
});
