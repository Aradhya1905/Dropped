import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors } from '../../../design-system/tokens';
import { useLoopsActive, useReducedMotion } from '../../../design-system/tokens/motion';

/** Where a stopped pulse rests: one still ring, mid-expansion, clearly visible. */
const STATIC_SCALE = 1.8;
const STATIC_OPACITY = 0.35;

export function UserDot() {
  const reduced = useReducedMotion();
  const loopsActive = useLoopsActive();
  const scale = useRef(new Animated.Value(reduced ? STATIC_SCALE : 0.4)).current;
  const opacity = useRef(new Animated.Value(reduced ? STATIC_OPACITY : 0.8)).current;

  useEffect(() => {
    if (reduced) {
      // A ring, not a pulse. The dot still reads as "you, with some uncertainty
      // around you" — which is what the animation was saying all along.
      scale.setValue(STATIC_SCALE);
      opacity.setValue(STATIC_OPACITY);
      return;
    }
    if (!loopsActive) return;

    scale.setValue(0.4);
    opacity.setValue(0.8);
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 3.2,
          duration: 2600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 2600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    // This used to leak: the loop was started without a teardown, so a dot that
    // unmounted (tab switch, screen pop) left its timer running forever.
    return () => loop.stop();
  }, [scale, opacity, reduced, loopsActive]);

  return (
    <View style={styles.root}>
      {/* pulse ring */}
      <Animated.View
        style={[
          styles.pulse,
          { transform: [{ scale }], opacity },
        ]}
      />
      {/* outer white halo + dark circle */}
      <View style={styles.dot}>
        {/* accent center pip */}
        <View style={styles.pip} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 0 4px ${colors.paperCard}, 0 4px 10px -2px rgba(43,33,20,0.5)`,
  },
  pip: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.accent,
  },
});
