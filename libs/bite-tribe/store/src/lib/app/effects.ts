import { inject, Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import {
  errorLoadingGpsPosition,
  fetchGpsPosition,
  goPrivate,
  goPublic,
  loadedGpsPosition,
  loadedSettingsFromApi,
  savePublicProfile,
  saveSettings,
  setPublicProfile,
} from './actions';
import { catchError, filter, map, of, switchMap, tap } from 'rxjs';
import { getCurrentPosition } from 'geolocation';
import { AlertController, Platform } from '@ionic/angular';
import { BiteTribeApiService } from 'bite-tribe/api';
import { fromAuth } from 'ta-firestore';
import { Store } from '@ngrx/store';

@Injectable()
export class AppEffect {
  private readonly actions$ = inject(Actions);
  private readonly platform = inject(Platform);
  private readonly api = inject(BiteTribeApiService);
  private readonly alertController = inject(AlertController);
  private readonly store = inject(Store);

  private readonly RETRY_GPS_BUTTON = {
    text: 'Retry',
    role: 'cancel',
    handler: () => {
      this.store.dispatch(fetchGpsPosition());
    },
  };

  loadSettingsFromApi$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() => this.api.settings$),
      map((settings) => loadedSettingsFromApi({ settings }))
    );
  });

  loadPublicProfile$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.loadedUser),
      filter((payload) => !!payload.user),
      switchMap(() => this.api.publicProfile$),
      map((profile) => setPublicProfile({ profile }))
    );
  });

  fetchGpsPosition$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(fromAuth.loadedUser, fetchGpsPosition),
        filter((payload) => {
          if (payload.type === fromAuth.loadedUser.type) {
            return !!payload.user;
          }
          return true;
        }),
        switchMap(() =>
          getCurrentPosition(this.platform).pipe(
            map((currentPosition) =>
              loadedGpsPosition({ position: currentPosition })
            ),
            catchError((error) => {
              console.log(error);
              this.alertController
                .create({
                  header: 'GPS Position missing',
                  subHeader:
                    'Your GPS position could not be determined. Please check your device settings, then retry.',
                  buttons: [this.RETRY_GPS_BUTTON],
                })
                .then((alert) => alert.present());
              return of(errorLoadingGpsPosition({ error }));
            })
          )
        )
      );
    },
    { useEffectsErrorHandler: true }
  );

  saveSettingsToFirestore$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(saveSettings),
        tap(({ settings }) => {
          this.api.saveSettings(settings);
        })
      );
    },
    { dispatch: false }
  );

  goPublicEffect$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(goPublic),
        tap(() => {
          this.api.saveUser();
        })
      );
    },
    { dispatch: false }
  );

  saveProfileToFirestore$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(savePublicProfile),
        tap(({ publicUser }) => {
          this.api.updateUser(publicUser);
        })
      );
    },
    { dispatch: false }
  );

  goPrivateEffect$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(goPrivate),
        tap(() => {
          this.api.deleteUser();
        })
      );
    },
    { dispatch: false }
  );
}
