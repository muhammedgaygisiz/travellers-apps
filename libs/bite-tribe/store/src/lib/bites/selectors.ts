import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { Bite, PublicUser } from 'model';
import { biteId } from '../router/selectors';
import { likes } from '../likes/selectors';
import {
  exchangeRates,
  gpsPosition,
  preferredCurrency,
} from '../app/selectors';
import {
  homeDistance,
  homeFilters,
  homeMaxPriceFilter,
  homeSorting,
  myBitesSorting,
} from '../filtering-and-sorting/selectors';
import { haversineDistance } from 'utils';
import { EntityState } from '@ngrx/entity';
import { handleNearbyFilter } from './utils/handle-nearby-filter';
import { handleTagFilters } from './utils/handle-tag-filters';
import { getLikesForBite } from './utils/get-likes-for-bite';
import { handleMaxPriceFilter } from './utils/handle-max-price-filter';
import { fromAuth } from 'ta-firestore';
import { selectedBucketlist } from '../bucketlists/selectors';
import { enrichByPriceInPreferredCurrency } from './utils/enrich-by-price-in-preferred-currency';
import { sortByCriteria } from './utils/sort-by-criteria';
import { byDistance } from './utils/by-distance';
import { getUniqueRestaurantNames } from './utils/get-unique-restaurant-names';
import { getNearbyBites } from './utils/get-nearby-bites';
import { getNearbyRestaurantNamesByPosition } from './utils/get-nearby-restaurant-names-by-position';
import { getTagSuggestionsByPlace } from './utils/get-tag-suggestions-by-place';

const slice = createFeatureSelector<
  EntityState<Bite> & {
    cachedBite?: Bite;
    editingBite?: Bite;
    biteCreator?: PublicUser;
  }
>(key);

const { selectAll } = adapter.getSelectors();

export const cachedBite = createSelector(slice, (state) => state?.cachedBite);

export const biteCreator = createSelector(slice, (state) => state?.biteCreator);

const allBites = createSelector(slice, selectAll);

export const bitesWithMetadata = createSelector(
  allBites,
  likes,
  gpsPosition,
  (bites, likes, gpsPosition) =>
    bites
      .map(
        (bite) =>
          ({
            ...bite,
            likes: getLikesForBite(likes, bite),
            distance: haversineDistance(
              bite.position?.latitude,
              bite.position?.longitude,
              gpsPosition?.latitude,
              gpsPosition?.longitude,
              'km',
            ),
          }) as Bite,
      )
      .sort(byDistance),
);

export const bites = createSelector(
  bitesWithMetadata,
  homeFilters,
  homeMaxPriceFilter,
  preferredCurrency,
  gpsPosition,
  homeDistance,
  exchangeRates,
  (
    bites,
    filters,
    maxPriceInPreferredCurrency,
    preferredCurrency,
    gpsPosition,
    homeDistance,
    exchangeRates,
  ) => {
    if (!filters.length && !homeDistance && maxPriceInPreferredCurrency === 0) {
      return bites;
    }

    const priceFilteredBites = handleMaxPriceFilter(
      maxPriceInPreferredCurrency,
      exchangeRates,
      bites,
      preferredCurrency,
    );

    const filteredBitesByNearby = handleNearbyFilter(
      homeDistance,
      gpsPosition,
      priceFilteredBites,
    );

    return handleTagFilters(filters, filteredBitesByNearby);
  },
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

export const bite = createSelector(
  biteId,
  bitesWithMetadata,
  exchangeRates,
  preferredCurrency,
  (id, bites, exchangeRates, preferredCurrency) => {
    const bite = bites.find((bite) => bite.id === id);
    return enrichByPriceInPreferredCurrency(
      bite,
      exchangeRates,
      preferredCurrency,
    );
  },
);

export const mybites = createSelector(
  bitesWithMetadata,
  fromAuth.selectUserId,
  (bites, userId) => bites.filter((bite) => bite.userId === userId),
);

export const sortedMyBites = createSelector(
  mybites,
  myBitesSorting,
  exchangeRates,
  (bites, sorting, exchangeRates) =>
    sortByCriteria(bites, sorting, exchangeRates),
);

export const bitesBySelectedBucketlist = createSelector(
  bitesWithMetadata,
  selectedBucketlist,
  (bites, selectedBucketlist) => {
    if (!selectedBucketlist) {
      return [];
    }

    return bites.filter((bite) =>
      selectedBucketlist.biteIds?.includes(bite.id),
    );
  },
);

export const sortedHomeBites = createSelector(
  bites,
  homeSorting,
  exchangeRates,
  (bites, sorting, exchangeRates) =>
    sortByCriteria(bites, sorting, exchangeRates),
);

export const bitesByUser = createSelector(
  bitesWithMetadata,
  biteCreator,
  (bites, biteCreator) =>
    bites.filter((bite) => bite.userId === biteCreator?.userId),
);

export const nearbyRestaurants = createSelector(bitesWithMetadata, (bites) =>
  getNearbyRestaurantNamesByPosition(bites),
);

export const editingBite = createSelector(slice, (state) => state?.editingBite);

const nearbyBitesWithTags = createSelector(bitesWithMetadata, (bites) => {
  const nearbyBites = getNearbyBites(bites);

  return nearbyBites.filter((bite) => bite.tags && bite.tags.length > 0);
});

export const tagSuggestionsForEditingBite = createSelector(
  editingBite,
  nearbyBitesWithTags,
  (bite, bites) => {
    if (!bite?.place) {
      return [];
    }

    return getTagSuggestionsByPlace(bite.place, bites);
  },
);
