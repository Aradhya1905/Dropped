/**
 * 11 You — "hello, stranger." The anonymous passport, the retention levers, and
 * the handwritten house rules.
 *
 * The notification rows are the settings that decide whether someone still has
 * this app in three months, so they are real controls rather than labels: every
 * one of them is read by `services/notifications/gate` before a single hum is
 * allowed out. Two rows stay deliberately untappable — map style (changed on the
 * Map tab) and unlock radius, which is the product's one rule.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';

import {
  FunKicker,
  MapTexture,
  PaperScreen,
} from '../../../design-system/components';
import {
  BookmarkIcon,
  ClockIcon,
  HeadingIcon,
  HeartIcon,
  HumIcon,
  LayersIcon,
  LocateIcon,
  LockIcon,
  WalkIcon,
} from '../../../design-system/icons';
import { colors, fonts } from '../../../design-system/tokens';
import { MoodChips } from '../../drop/components';
import { MOODS, type Mood } from '../../../types';
import { Passport } from '../components/Passport';
import {
  EraseDialog,
  OptionSheet,
  SettingRow,
  YourData,
  type SheetOption,
} from '../components';
import {
  getAccurateCompass,
  getDeviceId,
  getPrivacyZones,
  getReports,
  getEchoesEnabled,
  getMapStyle,
  getNotificationMode,
  getNotifyRadiusM,
  getOnlyWhenMoving,
  getQuietHours,
  getSubscribedMoods,
  setAccurateCompass,
  setEchoesEnabled,
  setNotificationMode,
  setNotifyRadiusM,
  setOnlyWhenMoving,
  setQuietHours,
  setSubscribedMoods,
  NOTIFY_RADIUS_OPTIONS,
  QUIET_HOURS_PRESETS,
  type NotificationMode,
  type NotifyRadiusM,
  type QuietHours,
} from '../../../services/storage';
import { mapStyleLabel } from '../../../services/maps';
import { useDeviceInfo, usePanicWipe } from '../hooks';
import {
  humModeLabel,
  moodsLabel,
  quietHoursLabel,
  radiusLabel,
} from '../labels';

const RULES = [
  'No usernames, no profiles.',
  'No photos. Just words.',
  'One device. One trail.',
  'Cruelty gets erased.',
];

const HUM_OPTIONS: SheetOption<NotificationMode>[] = [
  {
    value: 'off',
    label: 'Off',
    note: 'Never interrupt me. The map still knows what you walked past.',
  },
  {
    value: 'rare',
    label: 'Rare',
    note: 'At most one hum every few hours.',
  },
  {
    value: 'always',
    label: 'Always',
    note: 'Every drop you walk near, still spaced a few minutes apart.',
  },
];

const RADIUS_OPTIONS: SheetOption<NotifyRadiusM>[] = NOTIFY_RADIUS_OPTIONS.map(
  meters => ({
    value: meters,
    label: radiusLabel(meters),
    note:
      meters === 200
        ? 'Only what you would almost walk into.'
        : meters === 500
        ? 'A couple of streets.'
        : 'The whole neighbourhood.',
  }),
);

const QUIET_OPTIONS: SheetOption<QuietHours | null>[] = QUIET_HOURS_PRESETS.map(
  window => ({
    value: window,
    label: quietHoursLabel(window),
    note: window ? undefined : 'Let it hum at any hour.',
  }),
);

type Picker = 'hum' | 'quiet' | 'radius' | 'moods' | null;

export function YouScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: deviceInfo } = useDeviceInfo();
  const deviceId = getDeviceId().slice(0, 8).toUpperCase();
  // Re-read persisted settings whenever this tab regains focus, so a style
  // change made on the Map tab shows here without a remount.
  useIsFocused();

  const [picker, setPicker] = useState<Picker>(null);
  const close = () => setPicker(null);

  // The panic wipe. Armed here, confirmed in EraseDialog, and it only touches
  // this phone after the server has confirmed the erasure.
  const wipe = usePanicWipe();

  // Every lever is held in state as well as MMKV so the row updates under the
  // finger; the gate reads MMKV, so the write is what actually matters.
  const [hum, setHum] = useState(getNotificationMode);
  const pickHum = (mode: NotificationMode) => {
    setNotificationMode(mode);
    setHum(mode);
  };

  const [moving, setMoving] = useState(getOnlyWhenMoving);
  const toggleMoving = () => {
    const next = !moving;
    setOnlyWhenMoving(next);
    setMoving(next);
  };

  const [quiet, setQuiet] = useState(getQuietHours);
  const pickQuiet = (window: QuietHours | null) => {
    setQuietHours(window);
    setQuiet(window);
  };

  const [radius, setRadius] = useState(getNotifyRadiusM);
  const pickRadius = (meters: NotifyRadiusM) => {
    setNotifyRadiusM(meters);
    setRadius(meters);
  };

  const [moods, setMoods] = useState<Mood[]>(getSubscribedMoods);
  const toggleMood = (mood: Mood) => {
    const next = moods.includes(mood)
      ? moods.filter(m => m !== mood)
      : [...moods, mood];
    setSubscribedMoods(next);
    setMoods(next);
  };

  // Anniversary echoes — off until asked for, because being told about
  // something painful a year later should be a choice made with open eyes.
  const [echoes, setEchoes] = useState(getEchoesEnabled);
  const toggleEchoes = () => {
    const next = !echoes;
    setEchoesEnabled(next);
    setEchoes(next);
  };

  // The lying compass's escape hatch. Ships with the feature, not after it:
  // "walk around until the needle firms up" is not a game everyone can play,
  // and this is the only way out of it.
  const [accurate, setAccurate] = useState(getAccurateCompass);
  const toggleAccurate = () => {
    const next = !accurate;
    setAccurateCompass(next);
    setAccurate(next);
  };

  return (
    <PaperScreen>
      <MapTexture blur />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <FunKicker centered style={styles.kicker}>
          hello, stranger.
        </FunKicker>

        <Passport
          deviceId={deviceId}
          quotaRemaining={deviceInfo?.dropsQuotaRemaining}
        />

        <View style={styles.setList}>
          <SettingRow
            icon={<LayersIcon size={22} color={colors.accentDeep} />}
            label="Map style"
            value={mapStyleLabel(getMapStyle())}
          />
          {/*
            Not a setting, and it must never become one: 50 m is the promise the
            whole app is built on. It renders as a row because it's worth
            knowing, not because it's adjustable.
          */}
          <SettingRow
            icon={<LockIcon size={22} />}
            label="Unlock radius"
            note="The one rule. Every secret costs the same walk."
            value="50 m"
          />
        </View>

        <Text style={styles.sectionKick}>when the app may hum</Text>
        <Text style={styles.sectionNote}>
          The hum listens while the app is open. Walking with it in your pocket
          comes later.
        </Text>

        <View style={styles.setList}>
          <SettingRow
            icon={
              <HumIcon size={22} color={hum === 'off' ? colors.inkSoft : colors.accentDeep} />
            }
            label="Quiet hum"
            note="How often a secret nearby is worth an interruption."
            value={humModeLabel(hum)}
            quiet={hum === 'off'}
            onPress={() => setPicker('hum')}
          />

          {/*
            The row this whole screen exists for. A notification that fires
            while you're sitting at your desk is why people turn notifications
            off — and a walking app with notifications off is already uninstalled.
          */}
          <SettingRow
            icon={
              <WalkIcon size={22} color={moving ? colors.accentDeep : colors.inkSoft} />
            }
            label="Only when I'm moving"
            note="Stay silent while you're sitting still."
            value={moving ? 'On' : 'Off'}
            quiet={!moving}
            checked={moving}
            onPress={toggleMoving}
          />

          <SettingRow
            icon={
              <ClockIcon size={22} color={quiet ? colors.accentDeep : colors.inkSoft} />
            }
            label="Quiet hours"
            note="Nothing at all between these times."
            value={quietHoursLabel(quiet)}
            quiet={!quiet}
            onPress={() => setPicker('quiet')}
          />

          <SettingRow
            icon={<LocateIcon size={22} color={colors.accentDeep} />}
            label="Tell me within"
            note="How far off a secret can be and still be worth hearing about."
            value={radiusLabel(radius)}
            onPress={() => setPicker('radius')}
          />

          <SettingRow
            icon={
              <HeartIcon
                size={22}
                color={moods.length ? colors.accentDeep : colors.inkSoft}
              />
            }
            label="Moods worth waking for"
            note="Mute a mood instead of muting the app."
            value={moodsLabel(moods, MOODS.length)}
            quiet={moods.length === 0}
            onPress={() => setPicker('moods')}
          />
        </View>

        <View style={styles.setList}>
          <SettingRow
            icon={
              <BookmarkIcon
                size={22}
                color={echoes ? colors.accentDeep : colors.inkSoft}
              />
            }
            label="Anniversary echoes"
            note="Quietly tells you when you pass somewhere you stood a year ago."
            value={echoes ? 'On' : 'Off'}
            quiet={!echoes}
            checked={echoes}
            onPress={toggleEchoes}
          />

          <SettingRow
            icon={
              <HeadingIcon
                size={22}
                color={accurate ? colors.accentDeep : colors.inkSoft}
              />
            }
            label="Accurate compass"
            note="The needle normally drifts until you're close. Turn this on to have it point true the whole way."
            value={accurate ? 'On' : 'Off'}
            quiet={!accurate}
            checked={accurate}
            onPress={toggleAccurate}
          />
        </View>

        {/*
          Everything above this line is the app being playful about itself.
          Everything below it is the app answering for itself — see YourData.
        */}
        <YourData
          zoneCount={getPrivacyZones().length}
          reportCount={getReports().length}
          onOpenZones={() => navigation.navigate('PrivacyZones')}
          onOpenReports={() => navigation.navigate('Reports')}
          onErase={wipe.arm}
        />

        <View style={styles.rulesBlock}>
          <Text style={styles.rulesKick}>house rules — handwritten</Text>
          <View style={styles.rules}>
            {RULES.map((rule, i) => (
              <View
                key={rule}
                style={[
                  styles.rule,
                  {
                    transform: [{ rotate: i % 2 === 0 ? '-0.6deg' : '0.5deg' }],
                  },
                ]}
              >
                <Text style={styles.star}>✦</Text>
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.rulesSign}>
            — kept by everyone who walks here
          </Text>
        </View>
      </ScrollView>

      <OptionSheet
        visible={picker === 'hum'}
        kicker="walk-by notifications"
        title="how often?"
        options={HUM_OPTIONS}
        isActive={value => value === hum}
        onSelect={pickHum}
        onClose={close}
      />

      <OptionSheet
        visible={picker === 'quiet'}
        kicker="quiet hours"
        title="when to stay silent"
        options={QUIET_OPTIONS}
        isActive={value =>
          value?.startMin === quiet?.startMin && value?.endMin === quiet?.endMin
        }
        onSelect={pickQuiet}
        onClose={close}
      />

      <OptionSheet
        visible={picker === 'radius'}
        kicker="notification radius"
        title="how far is worth knowing?"
        options={RADIUS_OPTIONS}
        isActive={value => value === radius}
        onSelect={pickRadius}
        onClose={close}
      />

      <OptionSheet
        visible={picker === 'moods'}
        kicker="mood subscriptions"
        title="what's worth waking for"
        onClose={close}
      >
        <MoodChips
          moods={MOODS}
          selected={moods}
          onToggle={toggleMood}
          tintDots
        />
        <Text style={styles.sheetFoot}>
          Unticking every mood silences the hum completely — the map still shows
          them all.
        </Text>
      </OptionSheet>

      <EraseDialog
        stage={wipe.stage}
        receipt={wipe.receipt}
        error={wipe.error}
        onConfirm={wipe.confirm}
        onCancel={wipe.cancel}
        // Not `goBack` and not a tab switch: the wiped app has no trail, no
        // saves and a brand-new id, so it is a first launch — and onboarding is
        // where a first launch belongs. `reset` also drops every screen holding
        // the erased device's data out of memory.
        onFinish={() =>
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] })
        }
      />
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, zIndex: 10 },
  content: { paddingHorizontal: 24, paddingBottom: 30 },
  kicker: { alignSelf: 'center' },
  setList: { marginTop: 20, gap: 9 },
  sectionKick: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.24,
    textTransform: 'uppercase',
    color: colors.inkFaint,
    marginTop: 26,
    marginLeft: 2,
  },
  sectionNote: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.45,
    color: colors.inkSoft,
    marginTop: 6,
    marginLeft: 2,
    paddingRight: 12,
  },
  sheetFoot: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.45,
    color: colors.inkSoft,
    marginTop: 14,
  },
  rulesBlock: { marginTop: 22, marginHorizontal: 2 },
  rulesKick: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.24,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  rules: { marginTop: 13, gap: 11 },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  star: { color: colors.accent, fontSize: 15, marginTop: 2 },
  ruleText: {
    fontFamily: fonts.handSemibold,
    fontSize: 21,
    lineHeight: 21 * 1.05,
    color: colors.ink,
  },
  rulesSign: {
    fontFamily: fonts.handMedium,
    fontSize: 16,
    color: colors.inkFaint,
    marginTop: 16,
    marginBottom: 30,
    transform: [{ rotate: '-1deg' }],
  },
});
