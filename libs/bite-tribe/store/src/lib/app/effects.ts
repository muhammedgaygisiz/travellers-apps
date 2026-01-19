import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AppActions } from './actions';
import { catchError, filter, from, map, of, switchMap, take, tap } from 'rxjs';
import { Platform } from '@ionic/angular';
import { BiteTribeApiService } from 'bite-tribe/api';
import { fromAuth } from 'ta-firestore';
import { routerNavigatedAction } from '@ngrx/router-store';
import { BiteTribeStoreService } from '../bite-tribe-store.service';
import { PATH } from 'utils';
import { stopIfUserIsUndefined } from './utils/stop-if-user-is-undefined';
import { dispatchGpsPosition } from './utils/dispatch-gps-position';
import { initPushNotifications } from './utils/init-push-notifications';
import { Store } from '@ngrx/store';
import { withUserFromAction } from './utils/with-user-from-action';

@Injectable()
export class AppEffect {
  private readonly actions$ = inject(Actions);
  private readonly platform = inject(Platform);
  private readonly api = inject(BiteTribeApiService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly store = inject(Store);

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
      stopIfUserIsUndefined(),
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
      stopIfUserIsUndefined(),
      switchMap(() => this.api.publicProfile$.pipe(take(1))),
      map((profile) => AppActions.setPublicProfile({ profile })),
    );
  });

  initAfterLogin$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(fromAuth.AuthActions.loadedUser),
        stopIfUserIsUndefined(),
        dispatchGpsPosition(this.platform, this.store),
        withUserFromAction(),
        initPushNotifications(this.platform),
      ),
    { dispatch: false },
  );

  fetchGpsPosition$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.fetchGPSPosition, AppActions.reloadGPSPosition),
        dispatchGpsPosition(this.platform, this.store),
      ),
    { dispatch: false },
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
        stopIfUserIsUndefined(),
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
