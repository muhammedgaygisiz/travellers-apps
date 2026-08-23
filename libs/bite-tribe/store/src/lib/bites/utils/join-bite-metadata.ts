import type { Bite, Geopoint, Like } from 'model';
import { haversineDistance } from 'utils';
import { getLikesForBite } from './get-likes-for-bite';

type JoinedBite = {
  source: Bite;
  likes: Like[];
  distance: string | undefined;
  result: Bite;
};

const sameLikes = (previous: Like[], next: Like[]): boolean =>
  previous.length === next.length &&
  previous.every((like, index) => like === next[index]);

/**
 * Joins likes and distance onto Bites while keeping untouched Bites identical.
 *
 * The naive join spreads every Bite on every recompute, so one changed like
 * gave all of them a new identity and every card bound to one re-rendered.
 * On a profile holding 151 Bites that cost about two seconds of Ionic
 * re-rendering per tap, and the profile feed is not paginated, so all of them
 * were mounted. See GitHub issue #1357.
 *
 * The cache is keyed by Bite id and holds the inputs the join reads. A Bite
 * whose source object, likes and distance are all unchanged gets its previous
 * result back, so `@for` keeps its DOM and an `OnPush` card sees an unchanged
 * input. Only the Bite that actually changed re-renders.
 *
 * Likes are compared element by element rather than by array identity: the
 * index is rebuilt on each recompute, but the entity objects inside it keep
 * their identity unless the reducer replaced them.
 */
export const createBiteMetadataJoin = (): ((
  bites: Bite[],
  likesByBiteId: ReadonlyMap<string, Like[]>,
  gpsPosition: Geopoint | undefined,
) => Bite[]) => {
  let cache = new Map<string, JoinedBite>();
  let previousResult: Bite[] | undefined;

  return (bites, likesByBiteId, gpsPosition) => {
    const nextCache = new Map<string, JoinedBite>();

    const joined = bites.map((bite) => {
      const likes = getLikesForBite(likesByBiteId, bite);
      const distance = haversineDistance(
        bite.position?.latitude,
        bite.position?.longitude,
        gpsPosition?.latitude,
        gpsPosition?.longitude,
        'km',
      );

      const previous = cache.get(bite.id);

      if (
        previous &&
        previous.source === bite &&
        previous.distance === distance &&
        sameLikes(previous.likes, likes)
      ) {
        nextCache.set(bite.id, previous);
        return previous.result;
      }

      const result = { ...bite, likes, distance } as Bite;
      nextCache.set(bite.id, { source: bite, likes, distance, result });

      return result;
    });

    cache = nextCache;

    // Handing back the very same array when no Bite changed lets the selectors
    // built on top of this one keep their memoized result. `nearbyRestaurants`
    // is the expensive one: it fuzzy-dedups restaurant names across the whole
    // feed, and a new array alone was enough to make it run again.
    const previous = previousResult;

    if (
      previous &&
      previous.length === joined.length &&
      joined.every((bite, index) => bite === previous[index])
    ) {
      return previous;
    }

    previousResult = joined;

    return joined;
  };
};
