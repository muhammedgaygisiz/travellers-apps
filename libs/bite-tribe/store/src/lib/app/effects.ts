import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AppActions } from './actions';
import { catchError, filter, from, map, of, switchMap, tap } from 'rxjs';
import { getCurrentPosition } from 'geolocation';
import { Platform } from '@ionic/angular';
import { BiteTribeApiService } from 'bite-tribe/api';
import { fromAuth } from 'ta-firestore';
import { routerNavigatedAction } from '@ngrx/router-store';
import { BiteTribeStoreService } from '../bite-tribe-store.service';

@Injectable()
export class AppEffect {
  private readonly actions$ = inject(Actions);
  private readonly platform = inject(Platform);
  private readonly api = inject(BiteTribeApiService);
  private readonly storeService = inject(BiteTribeStoreService);

  loadSettingsFromApi$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.AuthActions.loadedUser),
      switchMap(() => this.api.settings$),
      map((settings) => AppActions.loadedSettingsFromAPI({ settings })),
    );
  });

  loadExchangeRatesFromApi$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.AuthActions.loadedUser),
      filter((payload) => !!payload.user),
      switchMap(() =>
        from(this.api.getExchangeRates()).pipe(
          map((exchangeRates) => {
            return AppActions.loadedExchangeRatesFromAPI({ exchangeRates });
          }),
        ),
      ),
    );
  });

  loadPublicProfile$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.AuthActions.loadedUser),
      filter((payload) => !!payload.user),
      switchMap(() => this.api.publicProfile$),
      map((profile) => AppActions.setPublicProfile({ profile })),
    );
  });

  fetchGpsPosition$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(
          fromAuth.AuthActions.loadedUser,
          AppActions.fetchGPSPosition,
          AppActions.reloadGPSPosition,
        ),
        filter((payload) => {
          if (payload.type === fromAuth.AuthActions.loadedUser.type) {
            return !!payload.user;
          }
          return true;
        }),
        switchMap(() =>
          getCurrentPosition(this.platform).pipe(
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
    },
    { useEffectsErrorHandler: true },
  );

  saveSettingsToFirestore$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(AppActions.saveSettings),
        tap(({ settings }) => {
          this.api.saveSettings(settings);
        }),
      );
    },
    { dispatch: false },
  );

  saveUserAfterLogin$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(fromAuth.AuthActions.loadedUser),
        filter((payload) => !!payload.user),
        tap(() => {
          this.api.saveUserIfNotExisting();
        }),
      );
    },
    { dispatch: false },
  );

  goPublicEffect$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(AppActions.goPublic),
        tap(() => {
          this.api.saveUser();
        }),
      );
    },
    { dispatch: false },
  );

  saveProfileToFirestore$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(AppActions.savePublicProfile),
        tap(({ publicUser }) => {
          this.api.updateUser(publicUser);
        }),
      );
    },
    { dispatch: false },
  );

  goPrivateEffect$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(AppActions.goPrivate),
        tap(() => {
          this.api.deleteUser();
        }),
      );
    },
    { dispatch: false },
  );

  reloadGpsOnPageChangeToCreateBite$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(routerNavigatedAction),
        filter((action) =>
          action.payload.event.urlAfterRedirects.includes('/new-bite'),
        ),
        tap(() => this.storeService.reloadGPSPosition()),
      );
    },
    { dispatch: false },
  );
}
