/**
 * The adapter caches both its enabled flag and the resolved native module at
 * module scope, so each test re-imports it fresh.
 */
type HapticsModule = typeof import('./index');

function load(): { haptics: HapticsModule; trigger: jest.Mock } {
  // Not `isolateModules`: the adapter requires the vendor module lazily, on the
  // first trigger, so it must resolve in the same registry this test reads from.
  jest.resetModules();
  const haptics = require('./index') as HapticsModule;
  const trigger = require('react-native-haptic-feedback').default
    .trigger as jest.Mock;
  trigger.mockClear();
  return { haptics, trigger };
}

describe('haptics', () => {
  it('fires the vendor module for each kind', () => {
    const { haptics, trigger } = load();
    haptics.trigger('tick');
    haptics.trigger('thump');
    haptics.trigger('snap');
    expect(trigger).toHaveBeenCalledTimes(3);
    // Semantic kinds must map to distinct feedback types, not all to one buzz.
    const types = trigger.mock.calls.map(([type]) => type);
    expect(new Set(types).size).toBe(3);
  });

  it('leaves the OS haptics setting in charge', () => {
    const { haptics, trigger } = load();
    haptics.trigger('thump');
    expect(trigger.mock.calls[0][1]).toMatchObject({
      ignoreAndroidSystemSettings: false,
    });
  });

  it('is a total no-op once disabled', () => {
    const { haptics, trigger } = load();
    haptics.setEnabled(false);
    haptics.trigger('tick');
    haptics.trigger('thump');
    haptics.trigger('snap');
    expect(trigger).not.toHaveBeenCalled();
    expect(haptics.isEnabled()).toBe(false);
  });

  it('fires again once re-enabled', () => {
    const { haptics, trigger } = load();
    haptics.setEnabled(false);
    haptics.setEnabled(true);
    haptics.trigger('tick');
    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('ignores an unknown kind instead of throwing', () => {
    const { haptics, trigger } = load();
    expect(() =>
      haptics.trigger('nonsense' as Parameters<HapticsModule['trigger']>[0]),
    ).not.toThrow();
    expect(trigger).not.toHaveBeenCalled();
  });

  it('swallows a throwing native module', () => {
    const { haptics, trigger } = load();
    trigger.mockImplementationOnce(() => {
      throw new Error('no motor');
    });
    expect(() => haptics.trigger('snap')).not.toThrow();
  });

  it('defaults to enabled and follows the persisted flag', () => {
    const { haptics, trigger } = load();
    haptics.initHaptics();
    expect(haptics.isEnabled()).toBe(true);

    haptics.setHapticsEnabled(false);
    haptics.trigger('tick');
    expect(trigger).not.toHaveBeenCalled();

    // Persisted, not just in-memory: a fresh init reads back the same value.
    haptics.setEnabled(true);
    haptics.initHaptics();
    expect(haptics.isEnabled()).toBe(false);
  });
});
