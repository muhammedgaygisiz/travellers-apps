import type { Like } from './like';

export type LikeType = Like['likeType'];

export interface LikeClick {
  biteId: string;
  likeType: LikeType;
  action: 'save' | 'remove';
  previousLikeType?: LikeType;
}
