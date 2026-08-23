import { createBiteMetadataJoin } from '../join-bite-metadata';
import { groupLikesByBiteId } from '../group-likes-by-bite-id';
import type { Bite, Geopoint, Like } from 'model';

const gps: Geopoint = { latitude: 50.9375, longitude: 6.9603 };

const bite = (id: string): Bite =>
  ({ id, position: { latitude: 50.93, longitude: 6.96 } }) as Bite;

const like = (biteId: string, likeType = 'thumbup'): Like =>
  ({ biteId, userId: 'user1', likeType }) as Like;

describe('createBiteMetadataJoin', () => {
  it('joins likes and distance onto each bite', () => {
    const join = createBiteMetadataJoin();

    const [first] = join([bite('1')], groupLikesByBiteId([like('1')]), gps);

    expect(first.likes).toEqual([like('1')]);
    expect(first.distance).toBeDefined();
  });

  /**
   * The reason this helper exists. Every Bite keeping its identity is what
   * stops one like from re-rendering a whole feed, and no assertion about the
   * values would notice if it stopped holding. See GitHub issue #1357.
   */
  it('returns the identical object when nothing about a bite changed', () => {
    const join = createBiteMetadataJoin();
    const bites = [bite('1'), bite('2')];
    const likes = [like('1')];

    const first = join(bites, groupLikesByBiteId(likes), gps);
    const second = join(bites, groupLikesByBiteId(likes), gps);

    expect(second[0]).toBe(first[0]);
    expect(second[1]).toBe(first[1]);
  });

  it('rebuilds only the bite whose like changed', () => {
    const join = createBiteMetadataJoin();
    const bites = [bite('1'), bite('2')];

    const first = join(bites, groupLikesByBiteId([like('1')]), gps);
    const second = join(
      bites,
      groupLikesByBiteId([like('1', 'drooling')]),
      gps,
    );

    expect(second[0]).not.toBe(first[0]);
    expect(second[0].likes).toEqual([like('1', 'drooling')]);
    expect(second[1]).toBe(first[1]);
  });

  it('rebuilds a bite whose own document changed', () => {
    const join = createBiteMetadataJoin();
    const likes = groupLikesByBiteId([]);
    const unchanged = bite('2');

    const first = join([bite('1'), unchanged], likes, gps);
    const second = join([bite('1'), unchanged], likes, gps);

    expect(second[0]).not.toBe(first[0]);
    expect(second[1]).toBe(first[1]);
  });

  it('rebuilds everything when the position moved', () => {
    const join = createBiteMetadataJoin();
    const bites = [bite('1'), bite('2')];
    const likes = groupLikesByBiteId([]);

    const first = join(bites, likes, gps);
    const second = join(bites, likes, { latitude: 52.52, longitude: 13.405 });

    expect(second[0]).not.toBe(first[0]);
    expect(second[1]).not.toBe(first[1]);
  });

  it('does not grow its cache past the bites it was last given', () => {
    const join = createBiteMetadataJoin();
    const kept = bite('2');

    const first = join([bite('1'), kept], groupLikesByBiteId([]), gps);
    join([kept], groupLikesByBiteId([]), gps);
    const third = join([kept], groupLikesByBiteId([]), gps);

    expect(third[0]).toBe(first[1]);
  });
});

describe('createBiteMetadataJoin array identity', () => {
  /**
   * Downstream selectors memoize on this array. `nearbyRestaurants` fuzzy-dedups
   * restaurant names across the whole feed, so handing back a new array for an
   * unchanged feed cost over a second of blocked main thread. See issue #1357.
   */
  it('returns the identical array when no bite changed', () => {
    const join = createBiteMetadataJoin();
    const bites = [bite('1'), bite('2')];
    const likes = groupLikesByBiteId([]);

    const first = join(bites, likes, gps);
    const second = join(bites, likes, gps);

    expect(second).toBe(first);
  });

  it('returns a new array once any bite changed', () => {
    const join = createBiteMetadataJoin();
    const bites = [bite('1'), bite('2')];

    const first = join(bites, groupLikesByBiteId([]), gps);
    const second = join(bites, groupLikesByBiteId([like('1')]), gps);

    expect(second).not.toBe(first);
  });
});
