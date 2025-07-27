import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { Bite, PublicUser } from 'model';
import { biteId } from '../router/selectors';
import { likes } from '../likes/selectors';
import { gpsPosition, homeDistance, homeFilters } from '../app/selectors';
import { haversineDistance } from 'utils';
import { EntityState } from '@ngrx/entity';
import { handleNearbyFilter } from './utils/handle-nearby-filter';
import { handleTagFilters } from './utils/handle-tag-filters';

const slice = createFeatureSelector<
  EntityState<any> & {
    cachedBite?: Bite;
    editingBite?: Bite;
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

export const bitesWithMetadata = createSelector(
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
  gpsPosition,
  homeDistance,
  (bites, filters, gpsPosition, homeDistance) => {
    if (!filters.length && !homeDistance) {
      return bites;
    }

    const filteredBitesByNearby = handleNearbyFilter(
      homeDistance,
      gpsPosition,
      bites
    );

    return handleTagFilters(filters, filteredBitesByNearby);
  }
);

export const allTags = createSelector(bitesWithMetadata, (bites) => {
  const tagsSet = new Set<string>();

  bites.forEach((bite) => {
    if (bite.tags && Array.isArray(bite.tags)) {
      bite.tags.forEach((tag: string) => {
        // Remove all # symbols from tags
        const cleanTag = tag.replace(/#/g, '');
        if (cleanTag) {
          tagsSet.add(cleanTag.toLowerCase());
        }
      });
    }
  });

  return Array.from(tagsSet).sort();
});

export const bite = createSelector(biteId, bites, (id, bites) =>
  bites.find((bite) => bite.id === id)
);
