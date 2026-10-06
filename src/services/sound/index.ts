/**
 * sound — the only module that touches audio playback
 * (`react-native-sound`). Like haptics, it is named after moments in the core
 * loop, not files: screens ask for "the seal rustled", not "play wav #2".
 *
 * Three tiny paper sounds, all quiet, all optional:
 * - paperRustle — the wax seal cracks open
 * - penScratch  — the confession is committed ("Drop it here")
 * - softThud    — the "Dropped" screen lands
 *
 * Silent mode: the audio category is `Ambient`. On iOS that honours the ring /
 * silent switch and mixes with the user's music instead of pausing it; on
 * Android the library plays `Ambient` on STREAM_NOTIFICATION, which goes quiet
 * in silent and vibrate modes. There's also a persisted on/off flag
 * (`settings.sounds`, default on).
 *
 * Files ship through Metro (`require('…wav')`), so release Android bundles them
 * as res/raw, iOS as main-bundle resources, and dev streams them from Metro.
 * Everything is fire-and-forget: a missing native module or file never throws.
 */
import { Image } from 'react-native';

import { getSoundsEnabled } from '../storage';

type SoundName = 'rustle' | 'scratch' | 'thud';

const SOURCES: Record<SoundName, number> = {
  rustle: require('../../../assets/sounds/paper_rustle.wav'),
  scratch: require('../../../assets/sounds/pen_scratch.wav'),
  thud: require('../../../assets/sounds/soft_thud.wav'),
};

/** Per-sound playback volume — they should sit under the UI, never over it. */
const VOLUME: Record<SoundName, number> = { rustle: 0.7, scratch: 0.55, thud: 0.8 };

interface Player {
  isLoaded(): boolean;
  setVolume(v: number): Player;
  stop(cb?: () => void): Player;
  play(cb?: (ok: boolean) => void): void;
  release(): void;
}

const players: Partial<Record<SoundName, Player>> = {};
let categorySet = false;

function lib(): any | null {
  try {
    return require('react-native-sound').default;
  } catch {
    return null;
  }
}

function load(name: SoundName): Player | null {
  const existing = players[name];
  if (existing) return existing;
  const Sound = lib();
  if (!Sound) return null;
  try {
    if (!categorySet) {
      Sound.setCategory('Ambient', true);
      categorySet = true;
    }
    const uri = Image.resolveAssetSource(SOURCES[name])?.uri;
    if (!uri) return null;
    const player: Player = new Sound(uri, '', (err: unknown) => {
      if (err) {
        // Drop the broken player so a later call can retry.
        delete players[name];
      } else {
        player.setVolume(VOLUME[name]);
      }
    });
    players[name] = player;
    return player;
  } catch {
    return null;
  }
}

function play(name: SoundName): void {
  if (!getSoundsEnabled()) return;
  const player = load(name);
  if (!player || !player.isLoaded()) return; // not ready yet — skip, never wait
  try {
    // Rewind first so a quick repeat restarts instead of being ignored.
    player.stop(() => player.play());
  } catch {
    /* audio must never take a screen down */
  }
}

/** Warm the players at app start so the first rustle isn't late. */
export function preloadSounds(): void {
  (Object.keys(SOURCES) as SoundName[]).forEach(load);
}

/** Free the native players (app teardown). */
export function releaseSounds(): void {
  (Object.keys(players) as SoundName[]).forEach(name => {
    try {
      players[name]?.release();
    } catch {
      /* already gone */
    }
    delete players[name];
  });
}

/** The wax seal cracks open. */
export const paperRustle = () => play('rustle');

/** The confession is committed to its spot. */
export const penScratch = () => play('scratch');

/** The "Dropped" screen lands. */
export const softThud = () => play('thud');
