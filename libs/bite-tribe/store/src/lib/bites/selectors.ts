import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { Bite, PublicUser } from 'model';
import { biteId } from '../router/selectors';
import { likes } from '../likes/selectors';
import { gpsPosition, homeFilters, settings } from '../app/selectors';
import { haversineDistance } from 'distance-pipe';
import { EntityState } from '@ngrx/entity';

const slice = createFeatureSelector<
  EntityState<any> & {
    cachedBite?: Bite;
    biteCreator?: PublicUser;
  }
>(key);

const { selectAll } = adapter.getSelectors();

export const cachedBite = createSelector(slice, (state) => state?.cachedBite);

export const biteCreator = createSelector(slice, (state) => state?.biteCreator);

const allBites = createSelector(slice, selectAll);

const byDistance = (a: any, b: any) => {
  return a.distance - b.distance;
};

const bitesWithMetadata = createSelector(
  allBites,
  likes,
  gpsPosition,
  (bites, likes, gpsPosition) => {
    return bites
      .map((bite) => {
        return {
          ...bite,
          likes: likes.filter((like) => bite.id === like.biteId) || [],
          distance: haversineDistance(
            bite.position?.latitude,
            bite.position?.longitude,
            gpsPosition?.latitude,
            gpsPosition?.longitude,
            'km'
          ),
        } as Bite;
      })
      .sort(byDistance);
  }
);

export const bites = createSelector(
  bitesWithMetadata,
  homeFilters,
  settings,
  gpsPosition,
  (bites, filters, appSettings, gpsPosition) => {
    if (!filters.length) {
      return bites;
    }

    let filteredBites = bites;

    // Handle nearby filter
    const hasNearbyFilter = filters.includes('nearby');
    if (hasNearbyFilter && gpsPosition && appSettings?.nearby) {
      const nearbyDistanceInKm = appSettings.nearby / 1000; // Convert meters to kilometers
      filteredBites = filteredBites.filter((bite) => {
        if (bite.distance) {
          const distance = parseFloat(bite.distance);
          return distance <= nearbyDistanceInKm;
        }

        return true;
      });
    }

    // Handle tag filters
    const tagFilters = filters.filter((filter) => filter !== 'nearby');
    if (tagFilters.length > 0) {
      filteredBites = filteredBites.filter((bite) => {
        if (!bite.tags || !Array.isArray(bite.tags)) {
          return false;
        }

        // Clean tags by removing # symbols for comparison
        const cleanTags = bite.tags.map((tag: string) => tag.replace(/^#/, ''));
        return tagFilters.some((filter) => cleanTags.includes(filter));
      });
    }

    return filteredBites;
  }
);

export const allTags = createSelector(bitesWithMetadata, (bites) => {
  const tagsSet = new Set<string>();

  bites.forEach((bite) => {
    if (bite.tags && Array.isArray(bite.tags)) {
      bite.tags.forEach((tag: string) => {
        // Remove # symbol from tags
        const cleanTag = tag.replace(/^#/, '');
        if (cleanTag) {
          tagsSet.add(cleanTag);
        }
      });
    }
  });

  return Array.from(tagsSet).sort();
});

export const bite = createSelector(biteId, bites, (id, bites) =>
  bites.find((bite) => bite.id === id)
);
