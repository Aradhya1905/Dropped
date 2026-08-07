/**
 * 05 Walk closer — a sealed secret too far to read: compass, distance,
 * address tag, blurred preview, and the "walk here to unlock" CTA, all on a
 * sheet over the blurred map.
 */
import React from 'react';
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
import { colors, fonts, shadows } from '../../../design-system/tokens';
import { Compass } from '../components/Compass';
import { useSpotPreview } from '../hooks';
import { previewToSealedSecret } from '../types';
import { useDropsStore } from '../../../store/dropsStore';
import { useDeviceLocation } from '../../map/hooks';
import { haversineMeters, bearingTo } from '../../../utils/geo';
import { fadesInLabel } from '../../../utils/expiry';
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
  const needleRotation =
    dropBearing != null && deviceHeading != null
      ? ((dropBearing - deviceHeading + 360) % 360)
      : dropBearing;

  // Text label points the way to walk: absolute bearing user → drop (pure GPS,
  // independent of which way the phone faces). The needle above still uses
  // deviceHeading so it spins with the phone.
  const cardinal = dropBearing != null ? toCardinal(dropBearing) : null;

  const walkMins = distM != null ? Math.max(1, Math.round(distM / 80)) : null;

  // null for a drop that lives forever — this screen then reads exactly as it
  // did before expiring drops existed.
  const fadesLabel = fadesInLabel(expiresAt);

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

          <Compass rotation={needleRotation} />

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
            <Text style={styles.previewHand}>
              {'Something was left here. '}
              <Text style={styles.previewBlur}>Walk close enough and it will open.</Text>
            </Text>
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
              <Text style={styles.sealRowText}>sealed · walk here to read</Text>
            </View>
            {/*
              The reason to walk today rather than some day. Sits under the
              seal line so the deadline reads as a property of the secret, not
              of the walk.
            */}
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
