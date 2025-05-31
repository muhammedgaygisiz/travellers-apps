import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter, BiteState } from './adapter';
import { Bite } from 'model';
import { biteId } from '../router/selectors';
import { likes } from '../likes/selectors';
import { gpsPosition } from '../app/selectors';
import { haversineDistance } from 'distance-pipe';

const slice = createFeatureSelector<BiteState>(key);

const { selectAll } = adapter.getSelectors();

export const cachedBite = createSelector(slice, (state) => state?.cachedBite);

const allBites = createSelector(slice, selectAll);

const byDistance = (a: any, b: any) => {
  return a.distance - b.distance;
};

export const bites = createSelector(
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

export const bite = createSelector(biteId, bites, (id, bites) =>
  bites.find((bite) => bite.id === id)
);
