export interface Like {
  userId: string;
  likeType: 'thumbup' | 'drooling' | 'mindblown';
  createdAt: string;
  biteId: string;
}
