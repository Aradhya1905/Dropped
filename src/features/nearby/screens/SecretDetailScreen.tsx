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
import { useDropsStore } from '../../../store/dropsStore';
import { useDeviceLocation } from '../../map/hooks';
import { haversineMeters } from '../../../utils/geo';

type Props = NativeStackScreenProps<RootStackParamList, 'SecretDetail'>;

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
  const { coord } = useDeviceLocation();

  const distM = coord && secret
    ? haversineMeters(coord, secret.drop.coordinate)
    : null;

  const walkMins = distM != null ? Math.max(1, Math.round(distM / 80)) : null;

  return (
    <PaperScreen>
      <MapTexture dense blur />

      <Sheet style={[styles.sheet, { top: insets.top + 64 }]}>
        <View style={[styles.inner, { paddingBottom: insets.bottom + 26 }]}>
          <Grabber style={styles.grabber} />
          <View style={styles.head}>
            <EmotionTag label="ache" />
            <CloseX onPress={() => navigation.goBack()} />
          </View>

          <Compass />

          <View style={styles.dist}>
            <Text style={styles.distBig}>
              {distM != null ? formatDist(distM) : '—'}
              <Text style={styles.distUnit}>{distM != null ? formatDistUnit(distM) : ''}</Text>
            </Text>
          </View>
          <Text style={styles.walkMeta}>
            {walkMins != null ? `${walkMins} min walk` : 'Locating…'}
          </Text>

          <View style={styles.addrTag}>
            <PinIcon size={20} dotColor={colors.accent} />
            <View style={styles.addrWho}>
              <Text style={styles.addrName}>{secret?.drop.placeLabel ?? 'Unknown place'}</Text>
              <Text style={styles.addrStreet}>
                {secret ? new Date(secret.drop.createdAt).toLocaleDateString() : ''}
              </Text>
            </View>
            <View style={styles.addrFound}>
              <Text style={styles.addrFoundNum}>{secret?.revealCount ?? 0}</Text>
              <Text style={styles.addrFoundLbl}>found</Text>
            </View>
          </View>

          <View style={styles.previewNote}>
            <Text style={styles.previewHand}>
              {'Something was left here. '}
              <Text style={styles.previewBlur}>Walk close enough and it will open.</Text>
            </Text>
            <View style={styles.sealRow}>
              <Svg width={11} height={11} viewBox="0 0 16 16" fill="none">
                <Path d="M5 7V5a3 3 0 0 1 6 0v2M4 7h8v5H4z" stroke={colors.accentDeep} strokeWidth={1.5} />
              </Svg>
              <Text style={styles.sealRowText}>sealed · walk here to read</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <AppButton
              label="Walk here to unlock"
              iconLeft={<WalkIcon size={18} />}
              onPress={() =>
                navigation.navigate('Main', {
                  screen: 'MapTab',
                  params: { screen: 'Walk', params: { secretId, beat: 'approach' } },
                })
              }
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
