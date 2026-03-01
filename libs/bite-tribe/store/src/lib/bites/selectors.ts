import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { BitesState } from './adapter';
import type { Bite } from 'model';
import { biteId } from '../router/selectors';
import { exchangeRates, preferredCurrency } from '../app/selectors';
import { enrichByPriceInPreferredCurrency } from './utils/enrich-by-price-in-preferred-currency';
import { getNearbyBites } from './utils/get-nearby-bites';
import { getNearbyRestaurantNamesByPosition } from './utils/get-nearby-restaurant-names-by-position';
import { getTagSuggestionsByPlace } from './utils/get-tag-suggestions-by-place';
import { bitesWithMetadata } from './home-bites.selector';

const slice = createFeatureSelector<BitesState>(key);

export const cachedBite = createSelector(
  slice,
  (state) => state?.cachedBite as Bite | undefined,
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

export const nearbyRestaurants = createSelector(bitesWithMetadata, (bites) =>
  getNearbyRestaurantNamesByPosition(bites),
);

export const editingBite = createSelector(slice, (state) => state?.editingBite);

export const nearbyBitesWithTags = createSelector(
  bitesWithMetadata,
  (bites) => {
    const nearbyBites = getNearbyBites(bites);

    return nearbyBites.filter((bite) => bite.tags && bite.tags.length > 0);
  },
);

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
