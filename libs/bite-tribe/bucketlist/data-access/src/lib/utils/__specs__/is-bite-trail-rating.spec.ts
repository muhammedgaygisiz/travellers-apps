import { isBiteTrailRating } from '../is-bite-trail-rating';

describe(isBiteTrailRating.name, () => {
  describe('given no data', () => {
    it('should return false', () => {
      expect(isBiteTrailRating(undefined)).toBe(false);
    });
  });

  describe('given something that is not a bite trail rating', () => {
    it('should return false', () => {
      expect(isBiteTrailRating({})).toBe(false);
      expect(isBiteTrailRating({ rating: 3 })).toBe(false);
      expect(isBiteTrailRating({ review: 'Great!' })).toBe(false);
      expect(isBiteTrailRating({ rating: '5', review: 'Great!' })).toBe(false);
      expect(isBiteTrailRating({ rating: 6, review: 'Great!' })).toBe(false);
      expect(isBiteTrailRating({ rating: 0, review: 'Great!' })).toBe(false);
    });
  });

  describe('given a bite trail rating', () => {
    it('should return true', () => {
      expect(isBiteTrailRating({ rating: 4, review: 'Really good!' })).toBe(
        true,
      );
    });
  });
});
