import {
  catchError,
  withLatestFrom,
  map,
  Observable,
  of,
  pipe,
  switchMap,
  take,
} from 'rxjs';
import {
  getCurrentPosition,
  LocationPermissionNotGrantedError,
} from 'geolocation';
import { AppActions } from '../actions';
import { Store } from '@ngrx/store';
import { gpsPosition } from '../selectors';
import { haversineDistance } from 'utils';
import type { Geopoint } from 'model';
import type { Position } from '@capacitor/geolocation/dist/esm/definitions';

export const GPS_MEANINGFUL_MOVEMENT_THRESHOLD_METERS = 100;

const hasMeaningfulMovement = (
  previousPosition: Geopoint | undefined,
  nextPosition: GeolocationPosition | Position,
): boolean => {
  if (!previousPosition) {
    return true;
  }

  const distanceInMeters = Number(
    haversineDistance(
      previousPosition.latitude,
      previousPosition.longitude,
      nextPosition.coords.latitude,
      nextPosition.coords.longitude,
      'm',
    ) ?? 0,
  );

  return distanceInMeters >= GPS_MEANINGFUL_MOVEMENT_THRESHOLD_METERS;
};

/** Dispatches the GPS position to the store */
export const dispatchGpsPosition = (
  store: Store,
): (<T>(source: Observable<T>) => Observable<T>) =>
  pipe(
    switchMap((args) =>
      getCurrentPosition().pipe(
        withLatestFrom(store.select(gpsPosition).pipe(take(1))),
        map(([currentPosition, previousPosition]) => {
          if (hasMeaningfulMovement(previousPosition, currentPosition)) {
            store.dispatch(
              AppActions.loadedGPSPosition({ position: currentPosition }),
            );

            return args;
          }

          // Under the movement threshold: still advance the marker to the fresh
          // position, but skip the bite refetch to spare the backend.
          store.dispatch(
            AppActions.updatedGPSPositionWithoutReload({
              position: currentPosition,
            }),
          );

          return args;
        }),
        // A read that failed for some other reason — no fix, a browser refusal —
        // leaves the permission state unknown, and the recovery UI keeps its
        // neutral wording rather than sending the user to a settings page that
        // would not have been the obstacle.
        catchError((error) => {
          console.error(error);

          store.dispatch(
            AppActions.errorLoadingGPSPosition({
              error,
              permissionState:
                error instanceof LocationPermissionNotGrantedError
                  ? error.permissionState
                  : undefined,
            }),
          );

          return of(args);
        }),
      ),
    ),
  );
