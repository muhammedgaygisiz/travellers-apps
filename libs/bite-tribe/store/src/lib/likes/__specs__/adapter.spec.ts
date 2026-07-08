import { Like } from 'model';
import { adapter } from '../adapter';

describe('Likes Adapter', () => {
  const likesAdapter = adapter;

  it('should use biteId and userId as id', () => {
    const like: Like = {
      biteId: 'bite1',
      userId: 'user1',
      likeType: 'thumbup',
      createdAt: '2026-01-01T00:00:00Z',
    };
    const id = likesAdapter.selectId(like);
    expect(id).toBe('bite1-user1');
  });
});
