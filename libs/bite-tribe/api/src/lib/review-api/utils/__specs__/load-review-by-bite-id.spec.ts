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
});
