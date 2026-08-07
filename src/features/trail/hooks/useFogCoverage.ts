import { useEffect, useState } from 'react';

import { formatCoverage } from '../../../services/maps';
import { getWalkedCells, onWalkedCellsChange } from '../../../services/storage';

export interface FogCoverageResult {
  /** Number of ~10 m cells the user has walked through. */
  cells: number;
  /** That, as a share of "your city" — already formatted (e.g. `2.4%`). */
  label: string;
}

/**
 * How much of the fog map the user has cleared. Lives entirely on device — the
 * walked path is never sent anywhere (see FUN_TODOs/01-fog-of-war.md).
 */
export function useFogCoverage(): FogCoverageResult {
  const [cells, setCells] = useState(() => getWalkedCells().size);

  useEffect(() => {
    const sub = onWalkedCellsChange(() => setCells(getWalkedCells().size));
    return () => sub.remove();
  }, []);

  return { cells, label: formatCoverage(cells) };
}
