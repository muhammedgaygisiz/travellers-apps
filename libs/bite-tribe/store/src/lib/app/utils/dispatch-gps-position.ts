import {
  catchError,
  map,
  Observable,
  of,
  pipe,
  switchMap,
  UnaryFunction,
} from 'rxjs';
import { Platform } from '@ionic/angular';
import { getCurrentPosition } from 'geolocation';
import { AppActions } from '../actions';
import { Action } from '@ngrx/store';

export const dispatchGpsPosition = (
  platform: Platform,
): UnaryFunction<Observable<any>, Observable<Action>> =>
  pipe(
    switchMap(() =>
      getCurrentPosition(platform).pipe(
        map((currentPosition) =>
          AppActions.loadedGPSPosition({ position: currentPosition }),
        ),
        catchError((error) => {
          console.error(error);

          return of(AppActions.errorLoadingGPSPosition({ error }));
        }),
      ),
    ),
  );
