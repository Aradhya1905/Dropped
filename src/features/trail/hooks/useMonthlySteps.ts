import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { getStepsThisMonth, isAvailable } from '../../../services/pedometer';

export interface MonthlyStepsResult {
  /** Steps this calendar month, or null when unavailable/denied (UI shows "—"). */
  steps: number | null;
  loading: boolean;
}

/**
 * Reads this month's locally-counted step total for the Trail receipt. The
 * pedometer service does the actual counting app-wide (see initStepCounting);
 * here we just read the accumulated total, refreshing each time the Trail
 * regains focus so the number reflects the latest walk. Resolves to
 * `steps: null` when motion access is unavailable so the receipt shows "—".
 */
export function useMonthlySteps(): MonthlyStepsResult {
  const [steps, setSteps] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setSteps(isAvailable() ? getStepsThisMonth() : null);
      setLoading(false);
    }, []),
  );

  return { steps, loading };
}
