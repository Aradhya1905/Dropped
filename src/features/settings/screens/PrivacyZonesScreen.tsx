/**
 * Private circles — the places this app is not allowed to look.
 *
 * A zone is set from where you're standing, because that's the honest way to
 * mark somewhere you actually are: no address search, no map pin dragged over a
 * neighbourhood, and above all no geocoder request carrying your home address
 * to anybody. The circle is drawn from the fix already streaming in.
 */
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import {
  CloseX,
  FunKicker,
  MapTexture,
  PaperScreen,
} from '../../../design-system/components';
import { LocateIcon, LockIcon } from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';
import {
  DEFAULT_ZONE_RADIUS_M,
  MAX_PRIVACY_ZONES,
  ZONE_RADIUS_OPTIONS,
} from '../../../services/location';
import { useDeviceLocation } from '../../map/hooks';
import { usePrivacyZones } from '../hooks';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyZones'>;

export function PrivacyZonesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { coord, shortAddress } = useDeviceLocation();
  const { zones, canAdd, suggestedLabel, add, remove, setRadius } =
    usePrivacyZones();
  const [radius, setNewRadius] = useState<number>(DEFAULT_ZONE_RADIUS_M);

  const handleAdd = () => {
    if (!coord || !canAdd) return;
    const forgotten = add(coord, radius, suggestedLabel);
    Alert.alert(
      `${suggestedLabel ?? 'Circle'} is private now`,
      forgotten > 0
        ? `Nothing new gets recorded inside it, and ${forgotten} ${
            forgotten === 1 ? 'place' : 'places'
          } already walked in there ${forgotten === 1 ? 'has' : 'have'} been forgotten.`
        : 'Nothing gets recorded inside it from now on.',
    );
  };

  const confirmRemove = (id: string, label?: string) => {
    Alert.alert(
      `Remove ${label ?? 'this circle'}?`,
      'The app starts recording your walks here again. What it already forgot stays forgotten.',
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => remove(id) },
      ],
    );
  };

  return (
    <PaperScreen>
      <MapTexture blur />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <FunKicker>never recorded.</FunKicker>
          <CloseX onPress={() => navigation.goBack()} />
        </View>
        <Text style={styles.title}>Private circles</Text>
        <Text style={styles.blurb}>
          Inside a circle, this app records no part of your walk, asks the server
          nothing about where you are, and won't let you drop a secret.
        </Text>

        {/*
          The claim that matters most, said where it applies rather than buried
          in a policy: these coordinates are on this phone and nowhere else.
        */}
        <View style={styles.pledge}>
          <LockIcon size={15} color={colors.accentDeep} />
          <Text style={styles.pledgeText}>
            A circle never leaves this device. It isn't synced, backed up, or
            sent anywhere — which also means it won't follow you to a new phone.
          </Text>
        </View>

        {zones.length > 0 && (
          <View style={styles.list}>
            {zones.map(zone => (
              <View key={zone.id} style={styles.zoneCard}>
                <View style={styles.zoneHead}>
                  <Text style={styles.zoneName}>{zone.label ?? 'Circle'}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${zone.label ?? 'circle'}`}
                    onPress={() => confirmRemove(zone.id, zone.label)}
                    hitSlop={10}
                  >
                    <Text style={styles.remove}>remove</Text>
                  </Pressable>
                </View>
                {/*
                  Deliberately no coordinates on screen. Printing the centre of
                  someone's home circle in the UI is a shoulder-surfing hazard
                  for zero benefit — they know where it is; they set it there.
                */}
                <Text style={styles.zoneMeta}>
                  {zone.radiusM} m across the middle
                </Text>
                <View style={styles.chips}>
                  {ZONE_RADIUS_OPTIONS.map(option => {
                    const active = option === zone.radiusM;
                    return (
                      <Pressable
                        key={option}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => setRadius(zone.id, option)}
                        style={({ pressed }) => [
                          styles.chip,
                          active && styles.chipActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[styles.chipText, active && styles.chipTextActive]}
                        >
                          {option} m
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        {canAdd ? (
          <View style={styles.addCard}>
            <Text style={styles.addKick}>
              new circle{suggestedLabel ? ` · ${suggestedLabel.toLowerCase()}` : ''}
            </Text>
            <Text style={styles.addWhere}>
              {shortAddress ?? (coord ? 'Right where you are' : 'Waiting for a fix…')}
            </Text>
            <View style={styles.chips}>
              {ZONE_RADIUS_OPTIONS.map(option => {
                const active = option === radius;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setNewRadius(option)}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {option} m
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={handleAdd}
              disabled={!coord}
              style={({ pressed }) => [
                styles.addBtn,
                !coord && styles.addBtnDim,
                pressed && styles.pressed,
              ]}
            >
              <LocateIcon size={17} color={colors.paperCard} />
              <Text style={styles.addBtnText}>Make this spot private</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.full}>
            All {MAX_PRIVACY_ZONES} circles are in use. Remove one to set another
            — home, work and school are about as many places as a person is
            regularly found, and more circles than that starts erasing the map
            itself.
          </Text>
        )}
      </ScrollView>
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, zIndex: 10 },
  content: { paddingHorizontal: 24 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: {
    fontFamily: fonts.serif,
    fontSize: 29,
    letterSpacing: 29 * -0.01,
    color: colors.ink,
    marginTop: 6,
  },
  blurb: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: colors.inkSoft,
    marginTop: 9,
  },
  pledge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 16,
    backgroundColor: colors.accentTint,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(118,149,124,0.3)',
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  pledgeText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 12 * 1.5,
    color: colors.inkSoft,
  },
  list: { marginTop: 20, gap: 11 },
  zoneCard: {
    backgroundColor: colors.paperCard,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingVertical: 15,
    paddingHorizontal: 16,
    boxShadow: '0 10px 20px -18px rgba(43,33,20,0.45)',
  },
  zoneHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  zoneName: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink },
  remove: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.18,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  zoneMeta: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    color: colors.inkSoft,
    marginTop: 3,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  chipActive: { backgroundColor: colors.accentTint, borderColor: colors.accent },
  chipText: { fontFamily: fonts.mono, fontSize: 10, color: colors.inkSoft },
  chipTextActive: { color: colors.accentDeep },
  addCard: {
    marginTop: 20,
    borderRadius: 13,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  addKick: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.24,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  addWhere: {
    fontFamily: fonts.handSemibold,
    fontSize: 21,
    color: colors.ink,
    marginTop: 6,
  },
  addBtn: {
    marginTop: 15,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  addBtnDim: { opacity: 0.45 },
  addBtnText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.paperCard },
  full: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.5,
    color: colors.inkSoft,
    marginTop: 20,
  },
  pressed: { opacity: 0.85 },
});
