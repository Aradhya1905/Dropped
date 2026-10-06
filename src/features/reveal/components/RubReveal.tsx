/**
 * Pencil-rubbing reveal. The freshly opened note starts blank — a sheet of
 * paper laid over the words — and rubbing a finger across it brings the text
 * up, like a pencil over a coin.
 *
 * Three stacked layers inside one box:
 *   1. behind the text: the rubbed strokes in faint graphite, so where you
 *      rubbed looks pencilled (it stays after the reveal);
 *   2. the text itself (children), laid out normally;
 *   3. over the text: a paper-coloured cover masked by the same strokes —
 *      white mask = covered, black stroke = a hole the words show through.
 *
 * Coverage is tracked on a coarse grid; past COMPLETE_AT the rest of the cover
 * fades away on its own and `onDone` fires. A light haptic grain ticks while
 * you rub. When `active` is false (a re-read, or a screen reader is on) it
 * renders the children untouched.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, Mask, Path, Rect } from 'react-native-svg';

import { colors, fonts } from '../../../design-system/tokens';
import { rub } from '../../../services/haptics';

/** Finger "pencil" width, px. */
const BRUSH = 40;
/** Ignore moves shorter than this — keeps the path small. */
const MIN_STEP = 5;
/** Coverage grid cell, px. */
const CELL = 22;
/** Fraction of the grid rubbed before the rest lifts on its own. */
const COMPLETE_AT = 0.55;
/** Minimum gap between haptic grains, ms. */
const GRAIN_MS = 80;
/** Bleed around the text so the quote mark and descenders are covered too. */
const BLEED = 12;

interface Props {
  active: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onDone?: () => void;
}

export function RubReveal({ active, children, style, onDone }: Props) {
  const [screenReader, setScreenReader] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader).catch(() => {});
  }, []);

  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [path, setPath] = useState('');
  const [done, setDone] = useState(false);

  const cover = useRef(new Animated.Value(1)).current;
  const hint = useRef(new Animated.Value(1)).current;

  const box = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });
  const d = useRef('');
  const last = useRef<{ x: number; y: number } | null>(null);
  const cells = useRef<Set<number>>(new Set());
  const lastGrain = useRef(0);
  const frame = useRef<number | null>(null);
  const finished = useRef(false);

  const on = active && !screenReader && !done;

  // With a screen reader on there's nothing to rub — the words are read out
  // straight away, so the reveal is already done.
  useEffect(() => {
    if (active && screenReader) onDone?.();
  }, [active, screenReader, onDone]);

  // The layers bleed past the text box on every side; `size` is the layer
  // size, and all stroke coordinates live in that space.
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width + BLEED * 2, h: height + BLEED * 2 });
  };

  const grid = useMemo(
    () => (size ? { cols: Math.ceil(size.w / CELL), rows: Math.ceil(size.h / CELL) } : null),
    [size],
  );

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    Animated.timing(cover, { toValue: 0, duration: 450, useNativeDriver: true }).start(() => {
      setDone(true);
      onDone?.();
    });
  }, [cover, onDone]);

  /** Mark every grid cell the brush touches at (x, y). */
  const markCells = useCallback(
    (x: number, y: number) => {
      if (!grid) return;
      const r = BRUSH / 2;
      const c0 = Math.max(0, Math.floor((x - r) / CELL));
      const c1 = Math.min(grid.cols - 1, Math.floor((x + r) / CELL));
      const r0 = Math.max(0, Math.floor((y - r) / CELL));
      const r1 = Math.min(grid.rows - 1, Math.floor((y + r) / CELL));
      for (let row = r0; row <= r1; row++) {
        for (let col = c0; col <= c1; col++) {
          const cx = col * CELL + CELL / 2;
          const cy = row * CELL + CELL / 2;
          if ((cx - x) ** 2 + (cy - y) ** 2 <= (r + CELL / 2) ** 2) {
            cells.current.add(row * grid.cols + col);
          }
        }
      }
    },
    [grid],
  );

  /** Batch path updates to one render per frame. */
  const flush = useCallback(() => {
    if (frame.current != null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setPath(d.current);
    });
  }, []);

  useEffect(
    () => () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const addPoint = useCallback(
    (x: number, y: number, start: boolean) => {
      const prev = last.current;
      if (start || !prev) {
        d.current += `M${x.toFixed(1)} ${y.toFixed(1)} l0.1 0 `;
        markCells(x, y);
      } else {
        const dist = Math.hypot(x - prev.x, y - prev.y);
        if (dist < MIN_STEP) return;
        d.current += `L${x.toFixed(1)} ${y.toFixed(1)} `;
        // Sample along fast swipes so coverage keeps up with the stroke.
        const steps = Math.ceil(dist / (CELL / 2));
        for (let i = 1; i <= steps; i++) {
          markCells(prev.x + ((x - prev.x) * i) / steps, prev.y + ((y - prev.y) * i) / steps);
        }
        const now = Date.now();
        if (now - lastGrain.current >= GRAIN_MS) {
          lastGrain.current = now;
          rub();
        }
      }
      last.current = { x, y };
      flush();
      if (grid && cells.current.size / (grid.cols * grid.rows) >= COMPLETE_AT) finish();
    },
    [finish, flush, grid, markCells],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: e => {
          Animated.timing(hint, { toValue: 0, duration: 250, useNativeDriver: true }).start();
          // Page coords minus the box's page origin: locationX/Y are relative
          // to whichever child was hit on Android, so they can't be trusted.
          const { pageX, pageY } = e.nativeEvent;
          box.current?.measure((_x, _y, _w, _h, px, py) => {
            origin.current = { x: px, y: py };
            addPoint(pageX - px, pageY - py, true);
          });
        },
        onPanResponderMove: e => {
          const { pageX, pageY } = e.nativeEvent;
          addPoint(pageX - origin.current.x, pageY - origin.current.y, false);
        },
        onPanResponderRelease: () => {
          last.current = null;
        },
      }),
    [addPoint, hint],
  );

  if (!active || screenReader) {
    return <View style={style}>{children}</View>;
  }

  const w = size?.w ?? 0;
  const h = size?.h ?? 0;

  return (
    <View style={style} onLayout={onLayout}>
      {/* 1 — graphite where you rubbed (stays after the reveal) */}
      {size ? (
        <Svg width={w} height={h} style={styles.layer} pointerEvents="none">
          <Path
            d={path || 'M0 0'}
            stroke="rgba(43,33,20,0.07)"
            strokeWidth={BRUSH}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      ) : null}

      {/* 2 — the words */}
      {children}

      {/* 3 — the paper over them, holed wherever you rubbed */}
      {size && on ? (
        <Animated.View
          ref={box}
          style={[styles.layer, { width: w, height: h, opacity: cover }]}
          {...responder.panHandlers}
          accessible={false}
        >
          <Svg width={w} height={h}>
            <Defs>
              <Mask id="rubMask" x={0} y={0} width={w} height={h} maskUnits="userSpaceOnUse">
                <Rect x={0} y={0} width={w} height={h} fill="white" />
                <Path
                  d={path || 'M0 0'}
                  stroke="black"
                  strokeWidth={BRUSH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Mask>
            </Defs>
            {/* a hair translucent: the words read as a faint impression in the
                paper, which is what invites the rub */}
            <Rect
              x={0}
              y={0}
              width={w}
              height={h}
              fill={colors.paperCard}
              fillOpacity={0.95}
              mask="url(#rubMask)"
            />
          </Svg>
          <Animated.View pointerEvents="none" style={[styles.hintWrap, { opacity: hint }]}>
            <Text style={styles.hint}>rub the page to bring it up</Text>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: -BLEED, top: -BLEED },
  hintWrap: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  hint: {
    fontFamily: fonts.handSemibold,
    fontSize: 21,
    color: colors.accentDeep,
    transform: [{ rotate: '-2deg' }],
  },
});
