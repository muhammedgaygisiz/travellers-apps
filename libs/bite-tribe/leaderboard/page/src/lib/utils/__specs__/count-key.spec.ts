import { countKey } from '../count-key';

describe('countKey (#2094)', () => {
  it('picks the -one key for exactly one', () => {
    expect(countKey('leaderboard-bite-count', 1)).toBe(
      'leaderboard-bite-count-one',
    );
  });

  it.each([0, 2, 3, 10, 101])('keeps the base key for %i', (count) => {
    expect(countKey('leaderboard-like-count', count)).toBe(
      'leaderboard-like-count',
    );
  });
});
