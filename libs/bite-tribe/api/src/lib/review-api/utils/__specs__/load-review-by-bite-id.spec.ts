import { loadReviewsByBiteId } from '../load-review-by-bite-id';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

jest.mock('@capacitor-firebase/firestore');

describe(loadReviewsByBiteId.name, () => {
  describe('given no reviews for bite', () => {
    it('should return empty array', async () => {
      (FirebaseFirestore.getCollection as jest.Mock).mockResolvedValue({
        snapshots: [],
      });

      const result = await loadReviewsByBiteId('biteId123');

      expect(result).toEqual([]);
      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: 'reviews',
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: 'biteId',
              opStr: '==',
              value: `/bites/biteId123`,
            },
          ],
        },
      });
    });
  });

  describe('given reviews for bite', () => {
    it('should return array of reviews', async () => {
      const mockReviews = [
        {
          id: 'review1',
          data: {
            biteId: '/bites/biteId123',
            rating: 5,
            comment: 'Great bite!',
          },
        },
        {
          id: 'review2',
          data: {
            biteId: '/bites/biteId123',
            rating: 4,
            comment: 'Good bite!',
          },
        },
      ];

      (FirebaseFirestore.getCollection as jest.Mock).mockResolvedValue({
        snapshots: mockReviews,
      });

      const result = await loadReviewsByBiteId('biteId123');

      expect(result).toEqual([
        {
          biteId: '/bites/biteId123',
          rating: 5,
          id: 'review1',
          comment: 'Great bite!',
        },
        {
          biteId: '/bites/biteId123',
          rating: 4,
          id: 'review2',
          comment: 'Good bite!',
        },
      ]);
      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: 'reviews',
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: 'biteId',
              opStr: '==',
              value: `/bites/biteId123`,
            },
          ],
        },
      });
    });
  });

  // The stored `author` was copied from the Firebase Auth user until issue
  // #1308, so on a Google or Apple account it holds the person's real name.
  // Every already-written review carries one, which is why the name is
  // resolved through `authorId` instead of read off the review.
  describe('given reviews stored with a name that is not the profile one', () => {
    const seedProfiles = (
      profiles: Record<string, Record<string, unknown> | null>,
    ): void => {
      (FirebaseFirestore.getDocument as jest.Mock).mockImplementation(
        async ({ reference }: { reference: string }) => ({
          snapshot: {
            data: profiles[reference.split('/').pop() as string] ?? null,
          },
        }),
      );
    };

    const seedReviews = (reviews: Record<string, unknown>[]): void => {
      (FirebaseFirestore.getCollection as jest.Mock).mockResolvedValue({
        snapshots: reviews.map(({ id, ...data }) => ({ id, data })),
      });
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders the display name from the profile, not the stored one', async () => {
      seedProfiles({ mo: { displayName: 'Mo' } });
      seedReviews([
        { id: 'review1', authorId: 'mo', author: 'Muhammed Gaygisiz' },
      ]);

      const [review] = await loadReviewsByBiteId('biteId123');

      expect(review.author).toBe('Mo');
    });

    it('resolves a reply the same way it resolves a root review', async () => {
      seedProfiles({ mo: { displayName: 'Mo' } });
      seedReviews([
        {
          id: 'reply1',
          authorId: 'mo',
          author: 'Muhammed Gaygisiz',
          parentReviewId: 'root-1',
          threadId: 'root-1',
        },
      ]);

      const [reply] = await loadReviewsByBiteId('biteId123');

      expect(reply.author).toBe('Mo');
    });

    it('reads one profile however many reviews an author wrote', async () => {
      seedProfiles({ mo: { displayName: 'Mo' } });
      seedReviews([
        { id: 'review1', authorId: 'mo', author: 'Muhammed Gaygisiz' },
        { id: 'review2', authorId: 'mo', author: 'Muhammed Gaygisiz' },
      ]);

      const reviews = await loadReviewsByBiteId('biteId123');

      expect(reviews.map((review) => review.author)).toEqual(['Mo', 'Mo']);
      expect(FirebaseFirestore.getDocument).toHaveBeenCalledTimes(1);
    });

    // A review from before `authorId` was written, or from an account that is
    // gone, has nothing to resolve against. Blanking those would only remove
    // the attribution they have left.
    it('keeps the stored name when the author cannot be resolved', async () => {
      seedProfiles({ mo: { displayName: 'Mo' } });
      seedReviews([
        { id: 'legacy1', author: 'Someone Legacy' },
        { id: 'gone1', authorId: 'deleted', author: 'Deleted Account' },
      ]);

      const reviews = await loadReviewsByBiteId('biteId123');

      expect(reviews.map((review) => review.author)).toEqual([
        'Someone Legacy',
        'Deleted Account',
      ]);
    });
  });

  /** Issue #2118: the text of a hidden item is read for its author only. */
  describe('given a hidden review', () => {
    const hidden = {
      id: 'hidden1',
      data: {
        biteId: '/bites/biteId123',
        authorId: 'mo',
        hiddenAt: '2026-11-18T10:00:00.000Z',
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
      (FirebaseFirestore.getCollection as jest.Mock).mockResolvedValue({
        snapshots: [hidden],
      });
      (FirebaseFirestore.getDocument as jest.Mock).mockImplementation(
        async ({ reference }: { reference: string }) => ({
          snapshot: {
            data: reference.startsWith('hiddenReviews/')
              ? { review: 'The original text.' }
              : { displayName: 'Mo' },
          },
        }),
      );
    });

    it('hands it on with no text and no author to another reader', async () => {
      const [review] = await loadReviewsByBiteId('biteId123', 'someone-else');

      expect(review).toMatchObject({ review: '', author: '' });
      expect(review.hiddenReview).toBeUndefined();
      expect(FirebaseFirestore.getDocument).not.toHaveBeenCalledWith({
        reference: 'hiddenReviews/hidden1',
      });
    });

    it('reads the kept text for its own author', async () => {
      const [review] = await loadReviewsByBiteId('biteId123', 'mo');

      expect(review).toMatchObject({
        review: '',
        author: '',
        hiddenReview: 'The original text.',
      });
      expect(FirebaseFirestore.getDocument).toHaveBeenCalledWith({
        reference: 'hiddenReviews/hidden1',
      });
    });

    it('falls back to the hidden line when the kept text cannot be read', async () => {
      (FirebaseFirestore.getDocument as jest.Mock).mockImplementation(
        async ({ reference }: { reference: string }) => {
          if (reference.startsWith('hiddenReviews/')) {
            throw new Error('permission-denied');
          }

          return { snapshot: { data: { displayName: 'Mo' } } };
        },
      );

      const [review] = await loadReviewsByBiteId('biteId123', 'mo');

      expect(review.hiddenReview).toBeUndefined();
    });
  });
});
