import {
  revealDrop,
  saveDrop,
  unsaveDrop,
  heartDrop,
  unheartDrop,
  reportDrop,
  fetchReplies,
  postReply as postReplyRequest,
  deleteReply as deleteReplyRequest,
  reportReply,
} from '../../../services/api';
import { apiReplyToReply } from '../../../services/api/mappers';
import type { Coordinate, Reply } from '../../../types';

export const postReveal = (id: string, coordinate: Coordinate) => revealDrop(id, coordinate);
export const postSave = (id: string) => saveDrop(id);
export const deleteSave = (id: string) => unsaveDrop(id);
export const postHeart = (id: string) => heartDrop(id);
export const deleteHeart = (id: string) => unheartDrop(id);
export const postReport = (id: string, reason: string) => reportDrop(id, reason);

export const getReplies = (id: string): Promise<{ replies: Reply[]; total: number }> =>
  fetchReplies(id).then(r => ({
    replies: r.replies.map(apiReplyToReply),
    total: r.total,
  }));

export const postReply = (id: string, body: string): Promise<Reply> =>
  postReplyRequest(id, body).then(apiReplyToReply);

export const deleteReply = (id: string, replyId: string) => deleteReplyRequest(id, replyId);

export const postReplyReport = (id: string, replyId: string, reason: string) =>
  reportReply(id, replyId, reason);
