/**
 * React hook wrapping getAddressFromCoords with loading/error/data state.
 *
 * Pass in coordinates and it resolves the address, re-running whenever the
 * coords change. Handles the usual async-in-effect hazards:
 *   - aborts the in-flight request when coords change or the component unmounts
 *     (so a stale response can't overwrite a newer one)
 *   - optional debounce so rapid coord updates (e.g. a moving GPS watch) don't
 *     spam Nominatim, which allows ~1 request/second
 *
 *   const { address, loading, error, refetch } = useReverseGeocode(coord);
 *   // coord: Coordinate | null — pass null to stay idle
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Coordinate } from '../../types';
import {
  getAddressFromCoords,
  ReverseGeocodeError,
  type ResolvedAddress,
} from './reverseGeocode';

export interface UseReverseGeocodeOptions {
  /** Wait this many ms after coords settle before fetching. Defaults to 0. */
  debounceMs?: number;
  /** BCP-47 language for the result, e.g. "en", "hi". */
  language?: string;
  /** Abort the request after this many ms. */
  timeoutMs?: number;
  /** Skip lookups entirely (e.g. screen not visible yet). Defaults to false. */
  disabled?: boolean;
}

export interface UseReverseGeocodeResult {
  address: ResolvedAddress | null;
  loading: boolean;
  error: ReverseGeocodeError | null;
  /** Manually re-run the lookup for the current coords. */
  refetch: () => void;
}

// Round to ~11m of precision so jitter in the same spot doesn't refetch.
function coordKey(coords: Coordinate | null | undefined): string | null {
  if (!coords) return null;
  return `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;
}

export function useReverseGeocode(
  coords: Coordinate | null | undefined,
  options: UseReverseGeocodeOptions = {},
): UseReverseGeocodeResult {
  const { debounceMs = 0, language, timeoutMs, disabled = false } = options;

  const [address, setAddress] = useState<ResolvedAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ReverseGeocodeError | null>(null);

  // Bump to force a refetch without changing coords.
  const [refetchToken, setRefetchToken] = useState(0);
  const refetch = useCallback(() => setRefetchToken(t => t + 1), []);

  // Key the effect on rounded coords so equal positions don't re-trigger.
  const key = coordKey(coords);
  // Keep the latest coords in a ref so the effect can read them without listing
  // the object identity (which changes every render) as a dependency.
  const coordsRef = useRef(coords);
  coordsRef.current = coords;

  useEffect(() => {
    if (disabled || !key) {
      return;
    }
    const current = coordsRef.current;
    if (!current) return;

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const fetchAddress = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getAddressFromCoords(current, {
          signal: controller.signal,
          language,
          timeoutMs,
        });
        if (!controller.signal.aborted) {
          setAddress(result);
        }
      } catch (err) {
        if (controller.signal.aborted) return; // superseded; ignore
        setError(
          err instanceof ReverseGeocodeError
            ? err
            : new ReverseGeocodeError('Reverse geocode failed', err),
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    if (debounceMs > 0) {
      timer = setTimeout(fetchAddress, debounceMs);
    } else {
      fetchAddress();
    }

    return () => {
      if (timer) clearTimeout(timer);
      controller.abort();
    };
    // coordsRef is a ref (stable); `key` captures coord identity for re-runs.
  }, [key, refetchToken, debounceMs, language, timeoutMs, disabled]);

  return { address, loading, error, refetch };
}
