import { createFeatureSelector, createSelector } from '@ngrx/store';
import { likes } from '../likes/selectors';
import {
  exchangeRates,
  gpsPosition,
  preferredCurrency,
} from '../app/selectors';
import { getLikesForBite } from './utils/get-likes-for-bite';
import { haversineDistance } from 'utils';
import type { Bite } from 'model';
import { byDistance } from './utils/by-distance';
import { BitesState } from './adapter';
import { key } from './key';
import { userId } from '../router/selectors';
import {
  myBitesDistance,
  myBitesFilters,
  myBitesMaxPriceFilter,
  myBitesSorting,
} from '../filtering-and-sorting/selectors';
import { handleMaxPriceFilter } from './utils/handle-max-price-filter';
import { handleNearbyFilter } from './utils/handle-nearby-filter';
import { handleTagFilters } from './utils/handle-tag-filters';
import { sortByCriteria } from './utils/sort-by-criteria';
import { sortBitesByCreatedAt } from './utils/sort-bites-by-created-at';

const slice = createFeatureSelector<BitesState>(key);

const bitesByUserId = createSelector(slice, (state) => state.bitesByUserId);

export const bitesByUserIdWithMetadata = createSelector(
  bitesByUserId,
  likes,
  gpsPosition,
  (bites, likes, gpsPosition) => {
    return bites
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
      .sort(byDistance);
  },
);

export const bitesByUser = createSelector(
  bitesByUserIdWithMetadata,
  userId,
  (bites, userId) => {
    return sortBitesByCreatedAt(bites.filter((bite) => bite.userId === userId));
  },
);

export const myProfileBites = createSelector(
  bitesByUserIdWithMetadata,
  (bites) => sortBitesByCreatedAt([...bites]),
);

export const mybites = createSelector(
  bitesByUserIdWithMetadata,
  myBitesFilters,
  myBitesMaxPriceFilter,
  preferredCurrency,
  gpsPosition,
  myBitesDistance,
  exchangeRates,
  (
    bites,
    filters,
    maxPriceInPreferredCurrency,
    preferredCurrency,
    gpsPosition,
    myBitesDistance,
    exchangeRates,
  ) => {
    if (
      !filters.length &&
      !myBitesDistance &&
      maxPriceInPreferredCurrency === 0
    ) {
      return bites;
    }

    const priceFilteredBites = handleMaxPriceFilter(
      maxPriceInPreferredCurrency,
      exchangeRates,
      bites,
      preferredCurrency,
    );

    const filteredBitesByNearby = handleNearbyFilter(
      myBitesDistance,
      gpsPosition,
      priceFilteredBites,
    );

    return handleTagFilters(filters, filteredBitesByNearby);
  },
);

export const sortedBitesByUser = createSelector(
  mybites,
  myBitesSorting,
  exchangeRates,
  (bites, sorting, exchangeRates) =>
    sortByCriteria(bites, sorting, exchangeRates),
);
