/**
 * The city constellation — every place you stood in one city, joined in walk
 * order, drawn in ink on paper.
 *
 * `citiesVisited` on the Trail receipt is a number; this is the same fact as a
 * keepsake. It is also the app's one deliberately shareable artifact, which is
 * why the export options live on the screen next to the picture rather than in
 * settings: **the choice about publishing where you walk is made at the moment
 * of publishing it.**
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import {
  AppButton,
  CloseX,
  FunKicker,
  MapTexture,
  PaperScreen,
  QueryState,
} from '../../../design-system/components';
import { colors, fonts, radii, shadows } from '../../../design-system/tokens';
import { shareImage } from '../../../services/share';
import { Constellation, type ConstellationHandle } from '../constellation/Constellation';
import { useCities, useCityPoints } from '../hooks';

type Props = NativeStackScreenProps<RootStackParamList, 'Constellation'>;

/** Filename-safe form of a city name, for the shared PNG. */
const slug = (city: string) =>
  city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'city';

export function ConstellationScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const cities = useCities();

  const [selected, setSelected] = useState<string | undefined>(route.params?.city);
  const [showLabels, setShowLabels] = useState(true);
  const [sharing, setSharing] = useState(false);

  // Default to the city with the most recent activity — the server already
  // orders them that way, so "your current city" is just the first one.
  useEffect(() => {
    if (!selected && cities.data && cities.data.length > 0) {
      setSelected(cities.data[0]!.city);
    }
  }, [cities.data, selected]);

  const points = useCityPoints(selected);
  const drawing = useRef<ConstellationHandle>(null);

  const current = useMemo(
    () => cities.data?.find(c => c.city === selected),
    [cities.data, selected],
  );

  const onShare = async () => {
    if (!selected || sharing) return;
    setSharing(true);
    try {
      const png = await drawing.current?.capture();
      if (!png) return;
      await shareImage({
        base64Png: png,
        filename: `dropped-${slug(selected)}`,
        // Places and dates only. The message names no secret and no street —
        // and with labels off it doesn't name the city either.
        message: showLabels
          ? `${selected}, drawn with my feet. Dropped.`
          : 'A city, drawn with my feet. Dropped.',
        title: 'Your constellation',
      });
    } finally {
      setSharing(false);
    }
  };

  const empty = cities.isSuccess && (cities.data?.length ?? 0) === 0;

  return (
    <PaperScreen>
      <MapTexture dense blur />
      <View style={[styles.view, { paddingTop: insets.top + 10 }]}>
        <View style={styles.topbar}>
          <FunKicker>the map you made by showing up.</FunKicker>
          <CloseX onPress={() => navigation.goBack()} />
        </View>

        <QueryState
          isLoading={cities.isLoading}
          error={cities.error}
          onRetry={cities.refetch}
          isEmpty={empty}
          emptyLabel={'No cities yet.\nWalk to a secret and this fills in.'}
        >
          <>
            {(cities.data?.length ?? 0) > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.picker}
                contentContainerStyle={styles.pickerContent}
              >
                {cities.data!.map(c => {
                  const on = c.city === selected;
                  return (
                    <Pressable
                      key={c.city}
                      onPress={() => setSelected(c.city)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={c.city}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {c.city}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.frame}>
              <QueryState
                isLoading={points.isLoading}
                error={points.error}
                onRetry={points.refetch}
              >
                <Constellation
                  ref={drawing}
                  points={points.data ?? []}
                  city={selected ?? ''}
                  showLabels={showLabels}
                />
              </QueryState>
            </View>

            {current && (
              <Text style={styles.caption}>
                <Text style={styles.captionEm}>{current.foundCount}</Text> found ·{' '}
                <Text style={styles.captionEm}>{current.droppedCount}</Text> left here
              </Text>
            )}

            {/*
              Offered at the moment of export, not buried in settings: a city
              name plus the shape of someone's regular walks is semi-identifying
              even though no secret is on the image.
            */}
            <Pressable
              style={styles.toggle}
              onPress={() => setShowLabels(v => !v)}
              accessibilityRole="switch"
              accessibilityState={{ checked: showLabels }}
            >
              <View style={[styles.box, showLabels && styles.boxOn]} />
              <Text style={styles.toggleText}>
                Show place names {showLabels ? '' : '· off, nothing is named'}
              </Text>
            </Pressable>

            <AppButton
              label={sharing ? 'Preparing…' : 'Share this drawing'}
              onPress={onShare}
              style={styles.share}
            />
            <Text style={styles.foot}>
              Places and dates only. No secret ever leaves on this image.
            </Text>
          </>
        </QueryState>
      </View>
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  view: { flex: 1, paddingHorizontal: 22, zIndex: 10 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loader: { marginTop: 40 },
  empty: {
    fontFamily: fonts.handSemibold,
    fontSize: 19,
    lineHeight: 26,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: 60,
  },
  picker: { flexGrow: 0, marginTop: 12 },
  pickerContent: { gap: 8, paddingVertical: 2, paddingHorizontal: 2 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipOn: { borderWidth: 1.5, borderColor: colors.accent, backgroundColor: colors.accentTint },
  chipText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 10 * 0.13,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  chipTextOn: { color: colors.accentDeep },
  frame: {
    marginTop: 14,
    alignSelf: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.paperCard,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    overflow: 'hidden',
    boxShadow: shadows.chip,
  },
  caption: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: 14,
  },
  captionEm: { fontFamily: fonts.serifMedium, color: colors.accentDeep },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    alignSelf: 'center',
    marginTop: 14,
  },
  box: {
    width: 15,
    height: 15,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  toggleText: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft },
  share: { marginTop: 16 },
  foot: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.1,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: 10,
  },
});
