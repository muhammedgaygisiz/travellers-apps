import type { Bucketlist } from 'model';
import { completesBucketlist } from '../completes-bucketlist';

const tried = (...biteIds: string[]): Bucketlist['triedOutBites'] =>
  biteIds.map((biteId) => ({ biteId, date: '', timestamp: 0 }));

const list = (
  biteIds: string[],
  triedOutBites: Bucketlist['triedOutBites'],
): Bucketlist => ({
  id: 'list-1',
  userId: 'user-1',
  name: 'Lisbon pastries',
  biteIds,
  triedOutBites,
});

describe('completesBucketlist', () => {
  it('is true for the tick that tries out the last Bite', () => {
    expect(
      completesBucketlist(list(['a', 'b'], tried('a', 'b')), 'b', true),
    ).toBe(true);
  });

  it('is false for a tick that leaves Bites untried', () => {
    expect(
      completesBucketlist(list(['a', 'b', 'c'], tried('a', 'b')), 'b', true),
    ).toBe(false);
  });

  it('is false for an un-tick', () => {
    expect(completesBucketlist(list(['a', 'b'], tried('a')), 'b', false)).toBe(
      false,
    );
  });

  it('is true for a one-Bite list', () => {
    expect(completesBucketlist(list(['a'], tried('a')), 'a', true)).toBe(true);
  });

  it('is false for an empty or missing list', () => {
    expect(completesBucketlist(list([], tried()), 'a', true)).toBe(false);
    expect(completesBucketlist(undefined, 'a', true)).toBe(false);
  });
});
