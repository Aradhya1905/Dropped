import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { postReport } from '../api';

export function useReport(id: string) {
  const [reported, setReported] = useState(false);

  const mutation = useMutation({
    mutationFn: (reason: string) => postReport(id, reason),
    onSuccess: () => setReported(true),
  });

  return {
    report: (reason: string) => mutation.mutate(reason),
    isPending: mutation.isPending,
    reported,
  };
}
