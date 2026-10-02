import type { Review } from 'model';
import { reviews } from '../selectors';

describe('Reviews Selectors', () => {
  // GitHub issue #1609.
  describe('reviews', () => {
    it('leaves out the reviews written by an account the user blocked', () => {
      const state = {
        ids: ['kept', 'blocked', 'reply'],
        entities: {
          kept: { id: 'kept', authorId: 'someone' } as Review,
          blocked: { id: 'blocked', authorId: 'blocked-user' } as Review,
          reply: {
            id: 'reply',
            authorId: 'someone',
            parentReviewId: 'blocked',
            threadId: 'blocked',
          } as Review,
        },
      };

      const result = reviews.projector(state, ['blocked-user']);

      expect(result.map((review) => review.id)).toEqual(['kept', 'reply']);
    });
  });
});
