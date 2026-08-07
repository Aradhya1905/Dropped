/**
 * 05 Walk closer — a sealed secret too far to read: compass, distance,
 * address tag, blurred preview, and the "walk here to unlock" CTA, all on a
 * sheet over the blurred map.
 *
 * Inside the whisper band (150–50 m) the blurred placeholder gives way to the
 * secret's mood and its first few words — the hook that's supposed to make you
 * walk the last two blocks. The teaser is only ever what the server sent; the
 * body still doesn't exist on this device until a verified reveal.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import {
  AppButton,
  CloseX,
  EmotionTag,
  Grabber,
  MapTexture,
  PaperScreen,
  Sheet,
} from '../../../design-system/components';
import { PinIcon, WalkIcon } from '../../../design-system/icons';
import { colors, fonts, moodColor, shadows } from '../../../design-system/tokens';
import { Compass } from '../components/Compass';
import { useNeedleWobble, useSpotPreview } from '../hooks';
import { previewToSealedSecret } from '../types';
import { useDropsStore } from '../../../store/dropsStore';
import { useDeviceLocation, useNearbyDrops } from '../../map/hooks';
import { WHISPER_RADIUS_M } from '../../../types';
import { haversineMeters, bearingTo } from '../../../utils/geo';
import { fadesInLabel } from '../../../utils/expiry';
import { conditionTag } from '../../../utils/revealCondition';
import { useCompassHeading } from '../../../services/location/useCompassHeading';

type Props = NativeStackScreenProps<RootStackParamList, 'SecretDetail'>;

const CARDINALS = ['North', 'NE', 'East', 'SE', 'South', 'SW', 'West', 'NW'];
function toCardinal(deg: number): string {
  return CARDINALS[Math.round(deg / 45) % 8];
}

function formatDist(m: number): string {
  if (m >= 1000) return (m / 1000).toFixed(1) + ' km';
  return Math.round(m) + '';
}

function formatDistUnit(m: number): string {
  return m >= 1000 ? '' : 'm';
}

export function SecretDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { secretId } = route.params;
  const secret = useDropsStore(s => s.drops.find(d => d.id === secretId));
  const upsertDrop = useDropsStore(s => s.upsertDrop);
  const { coord } = useDeviceLocation();

  // Shares the map's query key while no mood filter is set, so this costs
  // nothing while you stand still and refetches when you cross a ~33 m grid
  // cell. Without it the whisper on this screen would be frozen at whatever the
  // map last fetched — and this is the screen you're looking at *while* you
  // close the distance.
  //
  // Deliberately unfiltered: a mood filter is a view over the map, and it must
  // never starve the screen showing a secret you already opened (you can reach
  // one from the Trail that the map is currently hiding). The cost is one extra
  // key while a filter is active.
  //
  // This is also what upgrades a shared link from coarse to exact: a recipient
  // arrives with only the preview's ~100 m coordinate, and the first nearby
  // result that includes this drop replaces it with the real one.
  const { data: fresh } = useNearbyDrops(coord);
  useEffect(() => {
    fresh?.secrets.forEach(s => upsertDrop(s));
  }, [fresh, upsertDrop]);

  // Someone who arrived on a shared link is normally nowhere near the drop, so
  // it is not in the nearby results and not in the store. The preview endpoint
  // is the only thing that can describe the place to them — skipped entirely
  // when the drop is already known, so the walk-up flow costs no extra request.
  const { preview, isLoading: previewLoading, gone } = useSpotPreview(
    secretId,
    !secret,
  );

  // Everything below reads one shape. `approx` says whether the coordinate came
  // from the preview (coarsened to ~100 m server-side) rather than from a real
  // nearby result — the UI must not present that distance as exact.
  const spot = secret?.drop.coordinate ?? preview?.coordinate ?? null;
  const approx = !secret && preview != null;

  const placeLabel = secret?.drop.placeLabel ?? preview?.placeLabel;
  const createdAt = secret?.drop.createdAt ?? preview?.createdAt;
  const mood = secret?.mood ?? preview?.mood;
  const revealCount = secret?.revealCount ?? preview?.revealCount ?? 0;
  const replyCount = secret?.replyCount ?? 0;
  const expiresAt = secret?.expiresAt ?? preview?.expiresAt;

  const deviceHeading = useCompassHeading();

  const distM = coord && spot ? haversineMeters(coord, spot) : null;

  const dropBearing = coord && spot ? bearingTo(coord, spot) : null;

  // Needle rotation: bearing to drop relative to device heading (so needle
  // points at the drop no matter which way the phone faces).
  const trueNeedleRotation =
    dropBearing != null && deviceHeading != null
      ? ((dropBearing - deviceHeading + 360) % 360)
      : dropBearing;

  // …and then the compass lies about it, until you're close enough that it
  // doesn't. Drift is additive, so wrapping the post-heading bearing gives the
  // same needle as wrapping the raw one. The distance readout below is left
  // alone on purpose — see `useNeedleWobble`.
  const {
    rotation: needleRotation,
    tweenMs: needleTween,
    honest: needleHonest,
  } = useNeedleWobble(trueNeedleRotation, distM, secretId);

  // Text label points the way to walk: absolute bearing user → drop (pure GPS,
  // independent of which way the phone faces). The needle above still uses
  // deviceHeading so it spins with the phone.
  const cardinal = dropBearing != null ? toCardinal(dropBearing) : null;

  const walkMins = distM != null ? Math.max(1, Math.round(distM / 80)) : null;

  // null for a drop that lives forever — this screen then reads exactly as it
  // did before expiring drops existed.
  const fadesLabel = fadesInLabel(expiresAt);

  // null for a drop readable at any hour, which is nearly all of them.
  const gateLabel = conditionTag(secret?.revealCondition);

  // The client's own half of the 150 m line: the server decides what to send,
  // this decides what to show. Latched once heard — GPS jitter on the boundary
  // must not make a whisper blink in and out, and there's nothing to take back
  // once you've read it.
  //
  // Must sit above the `gone` early return below: it is a hook, and a hook
  // behind a conditional return changes call order between renders.
  const heardRef = useRef(false);
  if (distM != null && distM <= WHISPER_RADIUS_M) {
    heardRef.current = true;
  }
  const whisper = heardRef.current ? secret?.whisper : undefined;
  const whisperInk = moodColor(whisper?.mood).ink;

  /**
   * Start the walk. When all we have is a preview, seed the store with it
   * first so the Walk screen has a coordinate to aim at — coarse at the start
   * of the walk, then replaced by the exact drop as soon as the walker comes
   * inside the nearby radius (MapScreen upserts nearby results, and it stays
   * mounted underneath the walk).
   */
  const startWalk = () => {
    if (!secret && preview) {
      upsertDrop(previewToSealedSecret(preview));
    }
    navigation.navigate('Main', {
      screen: 'MapTab',
      params: { screen: 'Walk', params: { secretId, beat: 'approach' } },
    });
  };

  // Hidden, moderated and faded drops all answer the preview the same way, on
  // purpose — so there is one message, and it doesn't confirm the drop is real.
  if (gone) {
    return (
      <PaperScreen>
        <MapTexture dense blur />
        <Sheet style={[styles.sheet, { top: insets.top + 64 }]}>
          <View style={[styles.inner, { paddingBottom: insets.bottom + 26 }]}>
            <Grabber style={styles.grabber} />
            <View style={styles.head}>
              <EmotionTag label="wonder" />
              <CloseX onPress={() => navigation.goBack()} />
            </View>
            <View style={styles.goneBody}>
              <Text style={styles.goneTitle}>This isn't here anymore.</Text>
              <Text style={styles.goneSub}>
                It faded, or it was taken down. Whatever was left here is gone.
              </Text>
            </View>
            <View style={styles.actions}>
              <AppButton label="Back to the map" onPress={() => navigation.goBack()} />
            </View>
          </View>
        </Sheet>
      </PaperScreen>
    );
  }

  return (
    <PaperScreen>
      <MapTexture dense blur />

      <Sheet style={[styles.sheet, { top: insets.top + 64 }]}>
        <View style={[styles.inner, { paddingBottom: insets.bottom + 26 }]}>
          <Grabber style={styles.grabber} />
          <View style={styles.head}>
            <EmotionTag label={mood ?? 'wonder'} />
            <CloseX onPress={() => navigation.goBack()} />
          </View>

          <Compass rotation={needleRotation} tweenMs={needleTween} />

          <View style={styles.dist}>
            <Text style={styles.distBig}>
              {/* "≈" while the coordinate is the coarsened one. The number is
                  honest about being a neighbourhood, not a doorstep. */}
              {approx && distM != null ? '≈' : ''}
              {distM != null ? formatDist(distM) : '—'}
              <Text style={styles.distUnit}>{distM != null ? formatDistUnit(distM) : ''}</Text>
            </Text>
          </View>
          <Text style={styles.walkMeta}>
            {walkMins != null
              ? `${walkMins} min walk${cardinal != null ? ` · heading ${cardinal}` : ''}`
              : previewLoading
                ? 'Finding the place…'
                : 'Locating…'}
          </Text>
          {approx && (
            <Text style={styles.approxNote}>
              shared with you · exact spot sharpens as you get close
            </Text>
          )}
          {/*
            Said out loud, in the flow, not only in settings: the needle is
            wrong on purpose out here. Someone who can't play "search for it"
            needs to know there's a switch before they walk in circles — the
            distance above them stays honest either way.
          */}
          {!needleHonest && (
            <Text style={styles.needleNote}>
              the needle wanders this far out · it steadies as you close
            </Text>
          )}

          <View style={styles.addrTag}>
            <PinIcon size={20} dotColor={colors.accent} />
            <View style={styles.addrWho}>
              <Text style={styles.addrName}>{placeLabel ?? 'Unknown place'}</Text>
              <Text style={styles.addrStreet}>
                {createdAt != null ? new Date(createdAt).toLocaleDateString() : ''}
              </Text>
            </View>
            <View style={styles.addrFound}>
              <Text style={styles.addrFoundNum}>{revealCount}</Text>
              <Text style={styles.addrFoundLbl}>found</Text>
            </View>
          </View>

          <View style={styles.previewNote}>
            {whisper ? (
              // Close enough to hear it, not close enough to read it. The
              // teaser is the server's — capped, cut on a word boundary, and
              // never the whole confession.
              <>
                <Text style={[styles.whisperKicker, { color: whisperInk }]}>
                  you can almost hear it
                </Text>
                <Text style={[styles.previewHand, { color: whisperInk }]}>
                  {`“${whisper.teaser}”`}
                </Text>
                <Text style={styles.previewHand}>
                  <Text style={styles.previewBlur}>The rest opens at 50 m.</Text>
                </Text>
              </>
            ) : (
              <Text style={styles.previewHand}>
                {'Something was left here. '}
                <Text style={styles.previewBlur}>Walk close enough and it will open.</Text>
              </Text>
            )}
            {/*
              A link recipient never has a whisper here: it rides on a nearby
              result, and they are too far away to be in one. They get the
              placeholder branch until they walk into range.
            */}
            {replyCount > 0 && (
              // The count is public; the replies themselves are not. Knowing
              // people answered here is the pull — reading them still costs a walk.
              // A preview never carries this, so it only shows for a known drop.
              <Text style={styles.voices}>
                {replyCount} {replyCount === 1 ? 'voice has' : 'voices have'} answered
                here
              </Text>
            )}
            <View style={styles.sealRow}>
              <Svg width={11} height={11} viewBox="0 0 16 16" fill="none">
                <Path d="M5 7V5a3 3 0 0 1 6 0v2M4 7h8v5H4z" stroke={colors.accentDeep} strokeWidth={1.5} />
              </Svg>
              <Text style={styles.sealRowText}>
                {whisper ? 'whispering · walk here to read' : 'sealed · walk here to read'}
              </Text>
            </View>
            {/*
              The reason to walk today rather than some day. Sits under the
              seal line so the deadline reads as a property of the secret, not
              of the walk.
            */}
            {/*
              The hour, under the seal, for the same reason the deadline is
              here: it is a property of the secret, and knowing it before you
              set out is what stops the walk being wasted. A share-link preview
              never carries one — `DropPreview` has no condition — so this shows
              only for a drop the map already knows.
            */}
            {gateLabel != null && (
              <Text style={styles.gate}>{gateLabel}</Text>
            )}
            {fadesLabel != null && (
              <Text style={styles.fades}>{fadesLabel}</Text>
            )}
          </View>

          <View style={styles.actions}>
            <AppButton
              label={approx ? 'Walk toward it' : 'Walk here to unlock'}
              iconLeft={<WalkIcon size={18} />}
              onPress={startWalk}
            />
            <AppButton label="Save to come back later" variant="ghost" onPress={() => navigation.goBack()} />
          </View>
        </View>
      </Sheet>
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 15 },
  inner: { flex: 1, paddingTop: 16, paddingHorizontal: 26 },
  grabber: { marginBottom: 6 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dist: { alignItems: 'center', marginTop: 6 },
  distBig: {
    fontFamily: fonts.serif,
    fontSize: 62,
    lineHeight: 64,
    letterSpacing: 62 * -0.02,
    color: colors.ink,
  },
  distUnit: { fontFamily: fonts.serifItalic, fontSize: 24, color: colors.inkSoft },
  walkMeta: {
    textAlign: 'center',
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 9.5 * 0.22,
    textTransform: 'uppercase',
    color: colors.inkFaint,
    marginTop: 6,
  },
  // Sits under the walk meta, in the same quiet mono as the other stamps —
  // the honesty line for a coarsened, shared coordinate.
  approxNote: {
    textAlign: 'center',
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.2,
    textTransform: 'uppercase',
    color: colors.accentDeep,
    marginTop: 5,
  },
  // Sibling of `approxNote`, one step quieter: it's a property of the
  // instrument, not a warning about the data.
  needleNote: {
    textAlign: 'center',
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.2,
    textTransform: 'uppercase',
    color: colors.inkFaint,
    marginTop: 5,
  },
  goneBody: { marginTop: 'auto', marginBottom: 'auto', alignItems: 'center' },
  goneTitle: {
    fontFamily: fonts.serifItalic,
    fontSize: 28,
    color: colors.ink,
    textAlign: 'center',
  },
  goneSub: {
    fontFamily: fonts.sans,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.56,
    color: colors.inkSoft,
    maxWidth: 262,
    textAlign: 'center',
    marginTop: 12,
  },
  addrTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.paper,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  addrWho: { flex: 1 },
  addrName: { fontFamily: fonts.serifItalic, fontSize: 16, color: colors.ink },
  addrStreet: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkSoft },
  addrFound: { alignItems: 'flex-end' },
  addrFoundNum: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 18, color: colors.accentDeep },
  addrFoundLbl: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 8 * 0.18,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  previewNote: {
    backgroundColor: colors.paperCard,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 15,
    marginTop: 12,
    boxShadow: shadows.note,
    transform: [{ rotate: '-0.6deg' }],
  },
  previewHand: {
    fontFamily: fonts.handMedium,
    fontSize: 19,
    lineHeight: 19 * 1.2,
    color: colors.ink,
  },
  whisperKicker: {
    fontFamily: fonts.monoMedium,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.2,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  previewBlur: {
    color: 'transparent',
    opacity: 0.5,
    textShadowColor: colors.ink,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  voices: {
    fontFamily: fonts.handMedium,
    fontSize: 16,
    color: colors.accentDeep,
    marginTop: 8,
  },
  fades: {
    fontFamily: fonts.monoMedium,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.2,
    textTransform: 'uppercase',
    color: colors.accentDeep,
    marginTop: 6,
  },
  // Sibling of `fades` — same micro-caption weight, so the hour and the
  // deadline stack as two facts about the same secret.
  gate: {
    fontFamily: fonts.monoMedium,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.2,
    textTransform: 'uppercase',
    color: colors.accentDeep,
    marginTop: 6,
  },
  sealRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 },
  sealRowText: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.2,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  actions: { marginTop: 'auto', paddingTop: 18, gap: 4 },
});
