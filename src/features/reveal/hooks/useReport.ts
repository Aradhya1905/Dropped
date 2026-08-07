/**
 * useReport — flagging a secret, and being told it worked.
 *
 * Reporting has always worked server-side; what was missing was any sign of it.
 * A silent success on the one action someone takes when they've just read
 * something awful reads as "nothing happened", and the next thing they do is
 * uninstall. So the report is remembered locally: the button can then say
 * "reported" instead of offering itself again, and there is a list to show.
 */
import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { addReport, hasReported } from '../../../services/storage';
import { postReport } from '../api';

export interface UseReportResult {
  report: (reason: string) => void;
  isPending: boolean;
  /** True once this device has reported this secret — including on a relaunch. */
  reported: boolean;
  /** Set the moment a report lands, for the confirmation. Clear it on dismiss. */
  justReported: boolean;
  acknowledge: () => void;
  error: string | null;
}

export function useReport(id: string, placeLabel?: string): UseReportResult {
  // Seeded from disk, so re-opening a secret you already flagged doesn't invite
  // you to flag it again.
  const [reported, setReported] = useState(() => hasReported(id));
  const [justReported, setJustReported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (reason: string) => postReport(id, reason),
    onSuccess: () => {
      addReport({ id, at: Date.now(), placeLabel });
      setReported(true);
      setJustReported(true);
      setError(null);
    },
    // A failed report must not be remembered as a report — otherwise the button
    // goes quiet and the thing stays up with nobody having flagged it.
    onError: (e: { message?: string }) =>
      setError(e?.message ?? 'Could not send that report.'),
  });

  return {
    report: (reason: string) => mutation.mutate(reason),
    isPending: mutation.isPending,
    reported,
    justReported,
    acknowledge: useCallback(() => {
      setJustReported(false);
      setError(null);
    }, []),
    error,
  };
}
