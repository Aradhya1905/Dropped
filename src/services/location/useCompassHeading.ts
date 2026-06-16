import { useEffect, useRef, useState } from 'react';
import CompassHeading from 'react-native-compass-heading';

/**
 * Subscribes to the device magnetometer and returns the current heading
 * in degrees (0–360, 0 = north, clockwise). Returns null until first reading.
 *
 * `updateRate` — minimum change in degrees before a new value fires (default 3°).
 */
export function useCompassHeading(updateRate = 3): number | null {
  const [heading, setHeading] = useState<number | null>(null);
  const rateRef = useRef(updateRate);

  useEffect(() => {
    CompassHeading.start(rateRef.current, ({ heading: h }: { heading: number; accuracy: number }) => {
      setHeading(h);
    });
    return () => {
      CompassHeading.stop();
    };
  }, []);

  return heading;
}
