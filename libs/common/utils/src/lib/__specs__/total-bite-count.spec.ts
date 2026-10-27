import { totalBiteCount } from '../total-bite-count';

describe(totalBiteCount.name, () => {
  it('reports the aggregate when fewer Bites are loaded than it counts', () => {
    expect(totalBiteCount(42, 10)).toBe(42);
  });

  it('raises a stale aggregate to the number of loaded Bites', () => {
    expect(totalBiteCount(4, 5)).toBe(5);
  });

  it('counts the loaded Bites when the user document has no aggregate', () => {
    expect(totalBiteCount(undefined, 7)).toBe(7);
  });

  it('reports zero for a user without Bites', () => {
    expect(totalBiteCount(0, 0)).toBe(0);
  });
});
