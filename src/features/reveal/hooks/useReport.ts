import { useState } from 'react';
import { Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';

import { postReport } from '../api';

export function useReport(id: string) {
  const [reported, setReported] = useState(false);

  const mutation = useMutation({
    mutationFn: (reason: string) => postReport(id, reason),
    onSuccess: () => {
      setReported(true);
      // Reporting used to be completely silent — acknowledge it, or the user
      // reasonably assumes nothing happened and reports again.
      Alert.alert(
        'Thanks — it has been reported',
        'A moderator will take a look at this one.',
      );
    },
    onError: () => {
      Alert.alert("Couldn't send that report", 'Check your connection and try again.');
    },
  });

  return {
    report: (reason: string) => mutation.mutate(reason),
    isPending: mutation.isPending,
    reported,
  };
}
