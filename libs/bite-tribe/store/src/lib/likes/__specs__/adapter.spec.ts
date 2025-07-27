import { adapter } from '../adapter';

describe('Likes Adapter', () => {
  const likesAdapter = adapter;

  it('should use biteId and userId as id', () => {
    const like = { biteId: 'bite1', userId: 'user1' };
    const id = likesAdapter.selectId(like);
    expect(id).toBe('bite1-user1');
  });
});
