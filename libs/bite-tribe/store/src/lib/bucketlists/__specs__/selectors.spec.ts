import * as fromSelectors from '../selectors';
import { EntityState } from '@ngrx/entity';
import type { Bucketlist } from 'model';

describe('Bucketlists - selectors', () => {
  const BUCKETLIST_1 = { id: '1', name: 'Bucketlist 1' } as Bucketlist;
  const BUCKETLIST_2 = { id: '2', name: 'Bucketlist 2' } as Bucketlist;
  const initialState: EntityState<Bucketlist> = {
    ids: ['1', '2'],
    entities: {
      '1': BUCKETLIST_1,
      '2': BUCKETLIST_2,
    },
  };

  describe('bucketlists', () => {
    it('should return the bucketlists', () => {
      const result = fromSelectors.bucketlists.projector(initialState);
      expect(result).toEqual([BUCKETLIST_1, BUCKETLIST_2]);
    });
  });

  describe('selectedBucketlist', () => {
    it('should return the selected bucketlist by id', () => {
      const result = fromSelectors.selectedBucketlist.projector('1', [
        BUCKETLIST_1,
      ]);
      expect(result).toEqual(initialState.entities['1']);
    });

    it('should return undefined if bucketlist does not exist', () => {
      const result = fromSelectors.selectedBucketlist.projector(
        initialState,
        [],
      );
      expect(result).toBeUndefined();
    });

    it('should return undefined if slice is undefined', () => {
      const result = fromSelectors.selectedBucketlist.projector(
        undefined as unknown as Parameters<
          typeof fromSelectors.selectedBucketlist.projector
        >[0],
        [BUCKETLIST_1],
      );
      expect(result).toBeUndefined();
    });
  });

  describe('selectedBucketlistTitle', () => {
    it('should return the title of the selected bucketlist', () => {
      const result =
        fromSelectors.selectedBucketlistTitle.projector(BUCKETLIST_1);
      expect(result).toEqual(BUCKETLIST_1.name);
    });

    it('should return fallback title if bucketlist does not exist', () => {
      const result = fromSelectors.selectedBucketlistTitle.projector(undefined);
      expect(result).toEqual('My Bucketlist');
    });
  });

  describe('sortedBucketlists', () => {
    it('should return the bucketlists sorted by name ascending', () => {
      const result = fromSelectors.sortedBucketlists.projector([
        BUCKETLIST_2,
        BUCKETLIST_1,
      ]);

      expect(result).toEqual([BUCKETLIST_1, BUCKETLIST_2]);
    });

    it('should not mutate the incoming bucketlists', () => {
      const bucketlists = [BUCKETLIST_2, BUCKETLIST_1];

      fromSelectors.sortedBucketlists.projector(bucketlists);

      expect(bucketlists).toEqual([BUCKETLIST_2, BUCKETLIST_1]);
    });
  });
});
