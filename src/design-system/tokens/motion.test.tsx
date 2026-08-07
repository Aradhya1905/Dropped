/**
 * Reduced motion is an accessibility contract, so these tests assert the
 * *rendered value*, never the duration. A helper that still animates but
 * quickly would pass a `duration === 0` test and fail every person the setting
 * exists for.
 */
import React from 'react';
import { AccessibilityInfo, View } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import { FadeUp, FloatBob, PulseRing } from '../components/anim';
import { initMotion, isReducedMotion } from './motion';
import { getReducedMotion, setReducedMotion } from '../../services/storage';

// Spied rather than module-mocked: the OS half of reduced motion is whatever
// `AccessibilityInfo` says, and going through the real object keeps this test
// honest about the API it actually calls.
const osEnabled = jest
  .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
  .mockResolvedValue(false);
jest
  .spyOn(AccessibilityInfo, 'addEventListener')
  .mockReturnValue({ remove: jest.fn() } as never);

/** Turn the OS half on/off and let `initMotion` pick it up. */
async function setOsReduceMotion(on: boolean): Promise<void> {
  osEnabled.mockResolvedValue(on);
  await act(async () => {
    initMotion();
  });
}

/** Resolve whatever an Animated style prop currently is to a plain value. */
function resolve(value: unknown): unknown {
  if (value && typeof (value as { __getValue?: unknown }).__getValue === 'function') {
    return (value as { __getValue: () => unknown }).__getValue();
  }
  return value;
}

/** The flattened style the host View was actually rendered with. */
function styleOf(element: React.ReactElement): Record<string, unknown> {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  const host = tree.root.findAllByType('View' as never)[0];
  const raw = host.props.style;
  const merged: Record<string, unknown> = Object.assign(
    {},
    ...(Array.isArray(raw) ? raw.flat(Infinity) : [raw]).filter(Boolean),
  );

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (key === 'transform' && Array.isArray(value)) {
      out.transform = value.map(entry => {
        const [name, v] = Object.entries(entry as object)[0];
        return { [name]: resolve(v) };
      });
    } else {
      out[key] = resolve(value);
    }
  }
  act(() => tree.unmount());
  return out;
}

function transformValue(style: Record<string, unknown>, name: string): unknown {
  const list = (style.transform ?? []) as Array<Record<string, unknown>>;
  return list.find(entry => name in entry)?.[name];
}

beforeEach(async () => {
  setReducedMotion(false);
  await setOsReduceMotion(false);
});

describe('isReducedMotion', () => {
  it('is true when the OS asks for it', async () => {
    await setOsReduceMotion(true);
    expect(isReducedMotion()).toBe(true);
  });

  it('is true when the in-app toggle asks for it', () => {
    setReducedMotion(true);
    expect(isReducedMotion()).toBe(true);
  });

  it('is false only when both are off', () => {
    expect(getReducedMotion()).toBe(false);
    expect(isReducedMotion()).toBe(false);
  });

  it('cannot be switched back on by the app while the OS asks for stillness', async () => {
    // The OR is the whole design: the in-app control adds reduced motion, it
    // never takes it away.
    await setOsReduceMotion(true);
    setReducedMotion(false);
    expect(isReducedMotion()).toBe(true);
  });
});

describe('the animation helpers under reduced motion', () => {
  it('FadeUp renders arrived: full opacity, no offset', () => {
    setReducedMotion(true);
    const style = styleOf(
      <FadeUp>
        <View />
      </FadeUp>,
    );
    expect(style.opacity).toBe(1);
    expect(transformValue(style, 'translateY')).toBe(0);
  });

  it('FloatBob renders at rest: no drift, base rotation only', () => {
    setReducedMotion(true);
    const style = styleOf(
      <FloatBob rotate={2} deltaRotate={-1} deltaY={-9}>
        <View />
      </FloatBob>,
    );
    expect(transformValue(style, 'translateY')).toBe(0);
    expect(transformValue(style, 'rotate')).toBe('2deg');
  });

  it('PulseRing renders one still ring at its full radius', () => {
    setReducedMotion(true);
    const style = styleOf(<PulseRing size={80} toScale={1} peakOpacity={0.5} />);
    expect(transformValue(style, 'scale')).toBe(1);
    expect(style.opacity as number).toBeGreaterThan(0);
  });

  it('still animates when nothing has asked it not to', () => {
    // The guard against a helper that "stops" unconditionally: with motion
    // allowed, FadeUp must start from hidden and below.
    const style = styleOf(
      <FadeUp>
        <View />
      </FadeUp>,
    );
    expect(style.opacity).toBe(0);
    expect(transformValue(style, 'translateY')).toBe(12);
  });
});
