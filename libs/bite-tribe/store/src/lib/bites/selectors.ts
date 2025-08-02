import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { Bite, PublicUser } from 'model';
import { biteId } from '../router/selectors';
import { likes } from '../likes/selectors';
import {
  exchangeRates,
  gpsPosition,
  homeDistance,
  homeFilters,
  homeMaxPriceFilter,
  preferedCurrency,
} from '../app/selectors';
import { haversineDistance } from 'utils';
import { EntityState } from '@ngrx/entity';
import { handleNearbyFilter } from './utils/handle-nearby-filter';
import { handleTagFilters } from './utils/handle-tag-filters';
import { getLikesForBite } from './utils/get-likes-for-bite';
import { handleMaxPriceFilter } from './utils/handle-max-price-filter';
import { getBitePriceInPreferredCurrency } from './utils/get-bite-price-in-preferred-currency';

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
          likes: getLikesForBite(likes, bite),
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
  homeMaxPriceFilter,
  preferedCurrency,
  gpsPosition,
  homeDistance,
  exchangeRates,
  (
    bites,
    filters,
    maxPriceInPreferedCurrency,
    preferedCurrency,
    gpsPosition,
    homeDistance,
    exchangeRates
  ) => {
    if (!filters.length && !homeDistance && maxPriceInPreferedCurrency === 0) {
      return bites;
    }

    const filteredBitesByMaxPrice = handleMaxPriceFilter(
      maxPriceInPreferedCurrency,
      exchangeRates,
      bites,
      preferedCurrency
    );

    const filteredBitesByNearby = handleNearbyFilter(
      homeDistance,
      gpsPosition,
      filteredBitesByMaxPrice
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

const enrichByPriceInPreferredCurrency = (
  bite: Bite | undefined,
  exchangeRates: Record<string, number>,
  preferedCurrency: string
): Bite | undefined => {
  if (!bite) {
    return undefined;
  }

  return {
    ...bite,
    priceInPreferredCurrency: getBitePriceInPreferredCurrency(
      bite,
      exchangeRates,
      preferedCurrency
    ),
    priceInPreferredCurrencySymbol: preferedCurrency,
  };
};

export const bite = createSelector(
  biteId,
  bites,
  exchangeRates,
  preferedCurrency,
  (id, bites, exchangeRates, preferedCurrency) => {
    const bite = bites.find((bite) => bite.id === id);
    return enrichByPriceInPreferredCurrency(
      bite,
      exchangeRates,
      preferedCurrency
    );
  }
);
