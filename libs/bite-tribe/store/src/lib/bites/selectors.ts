import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { adapter } from './adapter';
import { Bite, PublicUser } from 'model';
import { biteId } from '../router/selectors';
import { likes } from '../likes/selectors';
import { gpsPosition } from '../app/selectors';
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
