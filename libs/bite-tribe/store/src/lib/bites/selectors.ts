import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { EntityState } from '@ngrx/entity';
import { Bite } from 'model';
import { biteId, restaurantId } from '../router/selectors';
import { likes } from '../likes/selectors';
import { gpsPosition } from '../app/selectors';
import { haversineDistance } from 'distance-pipe';

const slice = createFeatureSelector<EntityState<Bite>>(key);

const { selectAll } = adapter.getSelectors();

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

export const bitesByRestaurant = createSelector(
  bites,
  restaurantId,
  (bites, restaurantId) =>
    bites.filter(
      (bite) =>
        bite.restaurantId === restaurantId ||
        bite.place.trim() === restaurantId?.trim()
    )
);
