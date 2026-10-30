import { bucketlistProgress } from '../bucketlist-progress';

describe('bucketlistProgress', () => {
  it('is the share of the Bites tried out', () => {
    expect(
      bucketlistProgress({
        biteIds: ['a', 'b', 'c', 'd'],
        triedOutBites: [{}],
      }),
    ).toBe(0.25);
  });

  it('is 1 once every Bite is tried out', () => {
    expect(
      bucketlistProgress({ biteIds: ['a', 'b'], triedOutBites: [{}, {}] }),
    ).toBe(1);
  });

  it('is 0 for an empty list, which is never complete', () => {
    expect(bucketlistProgress({ biteIds: [], triedOutBites: [] })).toBe(0);
    expect(bucketlistProgress({})).toBe(0);
    expect(bucketlistProgress(undefined)).toBe(0);
  });

  it('is 0 when nothing is tried out yet', () => {
    expect(bucketlistProgress({ biteIds: ['a'] })).toBe(0);
  });
});
