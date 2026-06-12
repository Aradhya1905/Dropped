/**
 * 02 How it works — "Three simple rules" as taped paper tickets; rule two
 * carries the little wax seal that cracks open on a loop.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../app/navigation/types';
import {
  AppButton,
  FadeUp,
  FunKicker,
  FunTitle,
  MapTexture,
  PaperScreen,
  Postmark,
} from '../../../design-system/components';
import { ArrowRightIcon } from '../../../design-system/icons';
import { SealBreakMini } from '../components/SealBreakMini';
import { Ticket, TicketEm } from '../components/Ticket';

type Props = NativeStackScreenProps<RootStackParamList, 'HowItWorks'>;

export function HowItWorksScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <PaperScreen>
      <MapTexture />
      <Postmark style={[styles.postmark, { top: insets.top + 16 }]} />

      <View
        style={[styles.view, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 26 }]}
      >
        <FadeUp delay={100} style={styles.funhead}>
          <FunKicker>the whole game —</FunKicker>
          <FunTitle>Three simple rules.</FunTitle>
        </FadeUp>

        <View style={styles.tickets}>
          <FadeUp delay={250}>
            <Ticket
              num="1"
              rotate={-1.2}
              title="Walk the city"
              body="Sealed pins surface on the map — but only the ones near where you're standing."
            />
          </FadeUp>
          <FadeUp delay={400}>
            <Ticket
              badge={<SealBreakMini scale={1.55} />}
              rotate={1}
              title={
                <>
                  Get within <TicketEm>50 meters</TicketEm>
                </>
              }
              body="Stand where it happened and the wax breaks. That's the only way to read it."
            />
          </FadeUp>
          <FadeUp delay={550}>
            <Ticket
              num="3"
              rotate={-0.6}
              title="Drop your own"
              body="Pin a confession to a real place. It waits there for whoever walks by next."
            />
          </FadeUp>
        </View>

        <FadeUp delay={700} style={styles.ctaWrap}>
          <AppButton
            label="Got it"
            iconRight={<ArrowRightIcon />}
            onPress={() => navigation.navigate('Location')}
          />
        </FadeUp>
      </View>
    </PaperScreen>
  );
}

const styles = StyleSheet.create({
  postmark: { position: 'absolute', right: 22, zIndex: 11 },
  view: { flex: 1, paddingHorizontal: 26, zIndex: 12 },
  funhead: { marginBottom: 22 },
  tickets: { gap: 16 },
  ctaWrap: { marginTop: 'auto', paddingTop: 24 },
});
