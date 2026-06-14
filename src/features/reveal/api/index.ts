import {
  revealDrop,
  saveDrop,
  unsaveDrop,
  heartDrop,
  unheartDrop,
  reportDrop,
} from '../../../services/api';
import type { Coordinate } from '../../../types';

export const postReveal = (id: string, coordinate: Coordinate) => revealDrop(id, coordinate);
export const postSave = (id: string) => saveDrop(id);
export const deleteSave = (id: string) => unsaveDrop(id);
export const postHeart = (id: string) => heartDrop(id);
export const deleteHeart = (id: string) => unheartDrop(id);
export const postReport = (id: string, reason: string) => reportDrop(id, reason);
