/**
 * Replies pinned under a secret — small torn-paper strips in Caveat, oldest
 * first, each nudged a fraction of a degree so the stack reads as paper rather
 * than as a comment thread.
 *
 * Every state is rendered, not just the happy path: loading, error (with a
 * retry), empty, and the "you haven't stood here" gate — which is a normal
 * outcome of the feature, not a failure.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, fonts } from '../../../design-system/tokens';
import { MAX_REPLY_LENGTH, type Reply } from '../../../types';

/** Alternating half-degree tilt, so no two adjacent strips sit flush. */
const tilt = (i: number) => `${i % 2 === 0 ? -0.5 : 0.6}deg`;

function timeAgo(ms: number): string {
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 365) return `${days}d ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

function Kicker({ children }: { children: string }) {
  return <Text style={styles.kicker}>{children}</Text>;
}

export function ReplyStrips({
  replies,
  total,
  isLoading,
  gated,
  hasError,
  onRetry,
  canCompose,
  alreadyReplied,
  onSubmit,
  onDelete,
  isSubmitting,
  submitError,
}: {
  replies: Reply[];
  total: number;
  isLoading: boolean;
  /** Server says this device hasn't stood here. Not an error to retry. */
  gated: boolean;
  hasError: boolean;
  onRetry: () => void;
  canCompose: boolean;
  alreadyReplied: boolean;
  onSubmit: (body: string) => void;
  onDelete: (replyId: string) => void;
  isSubmitting: boolean;
  submitError: string | null;
}) {
  const [draft, setDraft] = useState('');
  const [composing, setComposing] = useState(false);

  const trimmed = draft.trim();
  const remaining = MAX_REPLY_LENGTH - draft.length;
  const canSubmit = trimmed.length > 0 && remaining >= 0 && !isSubmitting;

  if (gated) {
    return (
      <View style={styles.wrap}>
        <Kicker>sealed · walk here to read the replies</Kicker>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.wrap}>
        <Kicker>listening…</Kicker>
        <ActivityIndicator color={colors.accentDeep} style={styles.spinner} />
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.wrap}>
        <Kicker>couldn’t reach this place</Kicker>
        <Pressable onPress={onRetry} hitSlop={8} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Kicker>
        {total === 0
          ? 'no one has answered here yet'
          : `${total} ${total === 1 ? 'voice' : 'voices'} answered here`}
      </Kicker>

      {replies.map((r, i) => (
        <Pressable
          key={r.id}
          disabled={!r.mine}
          onLongPress={() => {
            if (!r.mine) return;
            Alert.alert('Remove your reply?', 'It will be gone from this spot.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: () => onDelete(r.id),
              },
            ]);
          }}
          style={[styles.strip, { transform: [{ rotate: tilt(i) }] }]}
        >
          <Text style={styles.stripBody}>{r.body}</Text>
          <Text style={styles.stripMeta}>
            {r.mine ? 'you · ' : ''}
            {timeAgo(r.createdAt)}
          </Text>
        </Pressable>
      ))}

      {canCompose && !alreadyReplied && !composing && (
        <Pressable
          onPress={() => setComposing(true)}
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
        >
          <Text style={styles.addBtnText}>Leave a line here</Text>
        </Pressable>
      )}

      {canCompose && composing && (
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            multiline
            autoFocus
            maxLength={MAX_REPLY_LENGTH}
            placeholder="One line, for whoever stands here next…"
            placeholderTextColor={colors.inkFaint}
            scrollEnabled={false}
          />
          <View style={styles.composerFoot}>
            <Text style={[styles.count, remaining < 0 && styles.countOver]}>
              {remaining}
            </Text>
            <View style={styles.composerBtns}>
              <Pressable
                onPress={() => {
                  setComposing(false);
                  setDraft('');
                }}
                hitSlop={8}
                style={styles.cancel}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!canSubmit}
                onPress={() => {
                  onSubmit(trimmed);
                  setComposing(false);
                  setDraft('');
                }}
                style={({ pressed }) => [
                  styles.submit,
                  !canSubmit && styles.submitDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.submitText}>
                  {isSubmitting ? 'Leaving…' : 'Leave it'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {submitError != null && <Text style={styles.error}>{submitError}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18, gap: 8 },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.2,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  spinner: { alignSelf: 'flex-start' },
  retry: { alignSelf: 'flex-start', paddingVertical: 4 },
  retryText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.accentDeep,
    textDecorationLine: 'underline',
  },
  strip: {
    backgroundColor: colors.paperCard,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    borderLeftWidth: 2,
    borderLeftColor: colors.accentTint,
    paddingVertical: 9,
    paddingHorizontal: 13,
    boxShadow: '0 8px 14px -12px rgba(43,33,20,0.45)',
  },
  stripBody: {
    fontFamily: fonts.hand,
    fontSize: 19,
    lineHeight: 19 * 1.15,
    color: colors.ink,
  },
  stripMeta: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 8 * 0.16,
    textTransform: 'uppercase',
    color: colors.inkFaint,
    marginTop: 5,
  },
  addBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line,
  },
  addBtnText: {
    fontFamily: fonts.handSemibold,
    fontSize: 17,
    color: colors.accentDeep,
  },
  composer: {
    backgroundColor: colors.paper,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingTop: 10,
    paddingHorizontal: 13,
    paddingBottom: 9,
  },
  input: {
    fontFamily: fonts.hand,
    fontSize: 19,
    lineHeight: 19 * 1.2,
    color: colors.ink,
    padding: 0,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  composerFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  count: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.inkFaint,
  },
  countOver: { color: colors.danger },
  composerBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cancel: { paddingVertical: 6, paddingHorizontal: 4 },
  cancelText: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft },
  submit: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.ink,
  },
  submitDisabled: { opacity: 0.4 },
  submitText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.paperCard,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
    color: colors.danger,
  },
  pressed: { opacity: 0.85 },
});
