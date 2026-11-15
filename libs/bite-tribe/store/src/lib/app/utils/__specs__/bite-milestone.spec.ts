import { reachedBiteMilestone } from '../bite-milestone';

describe('reachedBiteMilestone', () => {
  it.each([
    [4, 5, 5],
    [9, 10, 10],
    [49, 50, 50],
    [99, 100, 100],
    [199, 200, 200],
    [999, 1000, 1000],
    [1999, 2000, 2000],
  ])('answers the milestone %i to %i reaches', (previous, current, reached) => {
    expect(reachedBiteMilestone(previous, current)).toBe(reached);
  });

  it.each([
    [5, 6],
    [10, 49],
    [149, 150],
    [200, 201],
    [0, 1],
    [1, 4],
  ])('answers nothing for %i to %i', (previous, current) => {
    expect(reachedBiteMilestone(previous, current)).toBeUndefined();
  });

  it('answers nothing for a drop, even across a milestone', () => {
    expect(reachedBiteMilestone(200, 199)).toBeUndefined();
    expect(reachedBiteMilestone(6, 4)).toBeUndefined();
  });

  it('answers nothing for an unchanged count on a milestone', () => {
    expect(reachedBiteMilestone(100, 100)).toBeUndefined();
  });

  it('answers the highest milestone an update crosses, once', () => {
    expect(reachedBiteMilestone(8, 12)).toBe(10);
    expect(reachedBiteMilestone(3, 60)).toBe(50);
    expect(reachedBiteMilestone(90, 310)).toBe(300);
  });

  it('answers nothing without a previous count to cross from', () => {
    expect(reachedBiteMilestone(undefined, 5)).toBeUndefined();
    expect(reachedBiteMilestone(null, 100)).toBeUndefined();
    expect(reachedBiteMilestone(4, undefined)).toBeUndefined();
    expect(reachedBiteMilestone(Number.NaN, 5)).toBeUndefined();
  });

  it('counts from zero as from any other count', () => {
    expect(reachedBiteMilestone(0, 5)).toBe(5);
  });
});
