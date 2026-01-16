import type { Bite } from 'model';
import { sortBitesByDistance } from './sort-bites-by-distance';
import { sortBitesByLikes } from './sort-bites-by-likes';
import { sortBitesByCreatedAt } from './sort-bites-by-created-at';
import { sortBitesByRating } from './sort-bites-by-rating';
import { sortBitesByPrice } from './sort-bites-by-price';

const EMPTY_ARRAY: Bite[] = [];

export const sortByCriteria = (
  bites: Bite[],
  sorting: string,
  exchangeRates: Record<string, number>,
): Bite[] => {
  if (!bites?.length || !sorting) {
    return bites || EMPTY_ARRAY;
  }

  if (sorting === 'distance') {
    return [...sortBitesByDistance(bites)];
  }

  if (sorting === 'likes') {
    return [...sortBitesByLikes(bites)];
  }

  if (sorting === 'createdAt') {
    return [...sortBitesByCreatedAt(bites)];
  }

  if (sorting === 'rating') {
    return [...sortBitesByRating(bites)];
  }

  if (sorting === 'price') {
    return [...sortBitesByPrice(bites, exchangeRates)];
  }

  return bites || EMPTY_ARRAY;
};
