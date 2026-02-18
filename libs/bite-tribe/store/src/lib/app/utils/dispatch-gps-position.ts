import {
  catchError,
  map,
  Observable,
  of,
  pipe,
  switchMap,
  UnaryFunction,
} from 'rxjs';
import { getCurrentPosition } from 'geolocation';
import { AppActions } from '../actions';
import { Store } from '@ngrx/store';

/** Dispatches the GPS position to the store */
export const dispatchGpsPosition = (
  store: Store,
): UnaryFunction<Observable<any>, Observable<any>> =>
  pipe(
    switchMap((args: any) =>
      getCurrentPosition().pipe(
        map((currentPosition) => {
          store.dispatch(
            AppActions.loadedGPSPosition({ position: currentPosition }),
          );

          return args;
        }),
        catchError((error) => {
          console.error(error);

          store.dispatch(AppActions.errorLoadingGPSPosition({ error }));

          return of(args);
        }),
      ),
    ),
  );
