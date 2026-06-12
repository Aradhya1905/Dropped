/**
 * Route maps for the whole app.
 *
 * RootStack (headerless native-stack)
 * ├─ Welcome → HowItWorks → Location          (onboarding, screens 01–03)
 * ├─ Main → MainTabs: Map · Trail · You       (design tabbar)
 * │    └─ MapTab → MapStack: MapHome → Walk   (04 → 04a/b/c beats)
 * ├─ SecretDetail (05) · Opening (06) → Secret (07)
 * └─ Composer (08) → Dropped (09)
 */
import type { NavigatorScreenParams } from '@react-navigation/native';

/** The three beats of walking a secret into range (screens 04a/b/c). */
export type WalkBeat = 'approach' | 'range' | 'arrived';

export type MapStackParamList = {
  MapHome: undefined;
  Walk: { beat?: WalkBeat } | undefined;
};

export type MainTabParamList = {
  MapTab: NavigatorScreenParams<MapStackParamList> | undefined;
  TrailTab: undefined;
  YouTab: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  HowItWorks: undefined;
  Location: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  SecretDetail: undefined;
  Opening: undefined;
  Secret: undefined;
  Composer: undefined;
  Dropped: undefined;
};
