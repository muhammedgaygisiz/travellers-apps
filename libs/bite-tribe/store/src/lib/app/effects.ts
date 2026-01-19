import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AppActions } from './actions';
import { catchError, filter, from, map, of, switchMap, take, tap } from 'rxjs';
import { getCurrentPosition } from 'geolocation';
import { Platform } from '@ionic/angular';
import { BiteTribeApiService } from 'bite-tribe/api';
import { fromAuth } from 'ta-firestore';
import { routerNavigatedAction } from '@ngrx/router-store';
import { BiteTribeStoreService } from '../bite-tribe-store.service';
import { PATH } from 'utils';

@Injectable()
export class AppEffect {
  private readonly actions$ = inject(Actions);
  private readonly platform = inject(Platform);
  private readonly api = inject(BiteTribeApiService);
  private readonly storeService = inject(BiteTribeStoreService);

  loadTotalNumberBites$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.AuthActions.loginSucceeded),
      switchMap(() => {
        return this.api
          .getTotalNumberOfBites()
          .pipe(map((total) => AppActions.loadedTotalNumberOfBites({ total })));
      }),
    );
  });

  loadTotalNumberUsers$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.AuthActions.loginSucceeded),
      switchMap(() => {
        return this.api
          .getTotalNumberOfUsers()
          .pipe(map((total) => AppActions.loadedTotalNumberOfUsers({ total })));
      }),
    );
  });

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
      switchMap(() => this.api.publicProfile$.pipe(take(1))),
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
        switchMap(({ settings }) => {
          this.api.saveSettings(settings);

          // Also update the allowFollow field in PublicUser
          return this.storeService.publicUser$.pipe(
            take(1),
            tap((publicUser) => {
              if (
                publicUser &&
                publicUser.allowFollow !== settings.allowFollow
              ) {
                const updatedProfile = {
                  ...publicUser,
                  allowFollow: settings.allowFollow,
                };
                this.api.updateUser(updatedProfile);
              }
            }),
          );
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

  saveProfileToFirestore$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.savePublicProfile),
      switchMap(({ profile }) => {
        return from(this.api.updateUser(profile)).pipe(
          map((updatedUser) => {
            if (updatedUser) {
              return AppActions.savedPublicProfile({ profile: updatedUser });
            }

            return AppActions.errorSavingPublicProfile();
          }),
          catchError(() => of(AppActions.errorSavingPublicProfile())),
        );
      }),
    );
  });

  reloadGpsOnPageChangeToCreateBite$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(routerNavigatedAction),
        filter((action) =>
          action.payload.event.urlAfterRedirects.includes(`/${PATH.NEW_BITE}`),
        ),
        tap(() => this.storeService.reloadGPSPosition()),
      );
    },
    { dispatch: false },
  );

  followUser$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(AppActions.followUser),
        tap(({ user }) => this.api.followUser(user)),
      );
    },
    { dispatch: false },
  );
}
