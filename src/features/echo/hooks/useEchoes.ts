/**
 * useEchoes — "a year ago you stood here", without becoming a battery bug.
 *
 * Three rules, and all three matter more than the feature:
 *
 * 1. **Off unless asked for.** Read fresh on every focus, so turning echoes off
 *    on the You tab silences the Map and Trail the moment you walk back.
 * 2. **Ask rarely.** The endpoint is location-keyed and this hook sits on a GPS
 *    watch that fires every second or so. `echoCheckDue` allows one call per
 *    day per 250 m; everything else is served from the MMKV cache, which is
 *    also what lets a cold start draw a card with no request at all.
 * 3. **Never hold the text.** The cache keeps place, mood and which
 *    anniversary — never the body. Secrets the server did send arrive in the
 *    in-memory drops store, so opening one costs nothing while the app is up
 *    and re-earns the 50 m gate after a restart.
 *
 * There is no second location watch here: `coord` is the one the whole app
 * already shares (`services/location`).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import type { Coordinate, Mood } from '../../../types';
import { MOODS } from '../../../types';
import { apiSecretToSecret } from '../../../services/api/mappers';
import {
  getEchoCache,
  getEchoesEnabled,
  getMutedEchoIds,
  setEchoCache,
  setEchoMuted,
  type EchoMemo,
} from '../../../services/storage';
import { useDropsStore } from '../../../store/dropsStore';
import { dayKey, echoCheckDue } from '../../../utils/echo';
import { getEchoes } from '../api';
import type { EchoCardData } from '../types';

/** A cached memo, widened back into the app's types (mood is stored as text). */
function toCardData(memo: EchoMemo): EchoCardData {
  return {
    secretId: memo.secretId,
    interval: memo.interval,
    kind: memo.kind,
    stoodAt: memo.stoodAt,
    placeLabel: memo.placeLabel,
    // A mood retired server-side (or a downgrade) must not render as a blank
    // tint — fall back rather than trusting whatever was on disk.
    mood: (MOODS as readonly string[]).includes(memo.mood)
      ? (memo.mood as Mood)
      : 'wonder',
  };
}

export interface UseEchoesResult {
  /** Anniversaries to show, muted ones already removed. Empty when opted out. */
  echoes: EchoCardData[];
  /** Never remind me about this one again. Persists on device. */
  mute: (secretId: string) => void;
}

export function useEchoes(coord: Coordinate | null): UseEchoesResult {
  const [enabled, setEnabled] = useState(getEchoesEnabled);
  const [memos, setMemos] = useState<EchoMemo[]>(
    () => getEchoCache()?.memos ?? [],
  );
  const [muted, setMuted] = useState<string[]>(getMutedEchoIds);
  const upsertDrop = useDropsStore(s => s.upsertDrop);

  // One request at a time. A GPS watch can fire again long before a slow
  // network answers, and two identical echo calls are pure waste.
  const askingRef = useRef(false);

  // Settings and mutes are plain MMKV reads, not state we own — re-read them
  // whenever this screen comes back, which is the only moment they can have
  // changed (they're edited on another tab).
  useFocusEffect(
    useCallback(() => {
      setEnabled(getEchoesEnabled());
      setMuted(getMutedEchoIds());
      setMemos(getEchoCache()?.memos ?? []);
    }, []),
  );

  useEffect(() => {
    if (!enabled || coord == null || askingRef.current) return;

    const day = dayKey();
    if (!echoCheckDue(getEchoCache(), coord, day)) return;

    askingRef.current = true;
    const here = coord;

    getEchoes(here.lat, here.lng)
      .then(list => {
        const next: EchoMemo[] = list.map(echo => ({
          secretId: echo.secret.id,
          interval: echo.interval,
          kind: echo.kind,
          stoodAt: echo.stoodAt,
          placeLabel: echo.secret.drop.placeLabel,
          mood: echo.secret.mood,
        }));
        // The full secrets go to memory only — sealed or not, that's the
        // server's call, and the store is where every other screen reads them.
        list.forEach(echo => upsertDrop(apiSecretToSecret(echo.secret)));
        setEchoCache({ day, lat: here.lat, lng: here.lng, memos: next });
        setMemos(next);
      })
      .catch(() => {
        // A memory that fails to load is silence, not an error state — there is
        // nothing for the user to do about it and nothing they asked for.
        //
        // The checkpoint still moves: otherwise an endpoint that is down would
        // be retried on every single GPS fix, which is exactly the hammering
        // this hook exists to prevent. Yesterday's cached memos are kept.
        const previous = getEchoCache()?.memos ?? [];
        setEchoCache({ day, lat: here.lat, lng: here.lng, memos: previous });
      })
      .finally(() => {
        askingRef.current = false;
      });
  }, [enabled, coord, upsertDrop]);

  const mute = useCallback((secretId: string) => {
    setEchoMuted(secretId, true);
    setMuted(getMutedEchoIds());
  }, []);

  const echoes = useMemo(() => {
    if (!enabled) return [];
    return memos.filter(m => !muted.includes(m.secretId)).map(toCardData);
  }, [enabled, memos, muted]);

  return { echoes, mute };
}
