import { dedupMerge } from '../dedup-merge';

describe('replaceWithLatestBites', () => {
  describe('given latest bites that are not included in bite liste', () => {
    it('should return merge both', () => {
      const bites = [
        { id: '1', content: 'Bite 1' },
        { id: '2', content: 'Bite 2' },
      ];
      const latestBites = [
        { id: '3', content: 'Latest Bite 1' },
        { id: '4', content: 'Latest Bite 2' },
      ];

      const result = dedupMerge(bites as any, latestBites as any);

      expect(result).toEqual([...latestBites, ...bites]);
    });
  });

  describe('given latest bitest that are included in the bite list', () => {
    it('should replace bites with latest bites', () => {
      const bites = [
        { id: '1', content: 'Bite 1' },
        { id: '2', content: 'Bite 2' },
      ];
      const latestBites = [
        { id: '2', content: 'Latest Bite 2' },
        { id: '3', content: 'Latest Bite 1' },
      ];

      const result = dedupMerge(bites as any, latestBites as any);

      expect(result).toEqual([
        { id: '2', content: 'Latest Bite 2' },
        { id: '3', content: 'Latest Bite 1' },
        { id: '1', content: 'Bite 1' },
      ]);
    });
  });
});
