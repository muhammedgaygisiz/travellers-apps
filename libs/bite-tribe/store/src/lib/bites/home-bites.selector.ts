import { createFeatureSelector, createSelector } from '@ngrx/store';
import { sortByCriteria } from './utils/sort-by-criteria';
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
} from '../filtering-and-sorting/selectors';
import { likes } from '../likes/selectors';
import { adapter, BitesState } from './adapter';
import { key } from './key';
import { handleMaxPriceFilter } from './utils/handle-max-price-filter';
import { handleNearbyFilter } from './utils/handle-nearby-filter';
import { handleTagFilters } from './utils/handle-tag-filters';
import { dedupMerge } from './utils/dedup-merge';
import { groupLikesByBiteId } from './utils/group-likes-by-bite-id';
import { createBiteMetadataJoin } from './utils/join-bite-metadata';
import { byDistance } from './utils/by-distance';

/** Own cache per feed, so one feed's churn cannot evict another's. */
const joinHomeBiteMetadata = createBiteMetadataJoin();

const slice = createFeatureSelector<BitesState>(key);

const { selectAll } = adapter.getSelectors();

const allBites = createSelector(slice, selectAll);

const latestBites = createSelector(slice, (state) => state.latestBites);

export const bitesWithMetadata = createSelector(
  allBites,
  latestBites,
  likes,
  gpsPosition,
  (bites, latestBites, likes, gpsPosition) => {
    const dedupedBites = dedupMerge(bites, latestBites);

    return joinHomeBiteMetadata(
      dedupedBites,
      groupLikesByBiteId(likes),
      gpsPosition,
    ).sort(byDistance);
  },
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

export const sortedHomeBites = createSelector(
  bites,
  homeSorting,
  exchangeRates,
  (bites, sorting, exchangeRates) =>
    sortByCriteria(bites, sorting, exchangeRates),
);
