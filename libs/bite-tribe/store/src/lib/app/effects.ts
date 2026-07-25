import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AppActions } from './actions';
import {
  catchError,
  filter,
  from,
  map,
  of,
  switchMap,
  take,
  tap,
  throttleTime,
} from 'rxjs';
import { NavController, Platform } from '@ionic/angular';
import { BiteTribeApiService } from 'bite-tribe/api';
import { AnalyticsEvent, AnalyticsService, fromAuth } from 'ta-firestore';
import { routerNavigatedAction } from '@ngrx/router-store';
import { BiteTribeStoreService } from '../bite-tribe-store.service';
import { isBase64String, PATH } from 'utils';
import { stopIfUserIsUndefined } from './utils/stop-if-user-is-undefined';
import { dispatchGpsPosition } from './utils/dispatch-gps-position';
import { initPushNotifications } from './utils/init-push-notifications';
import { Store } from '@ngrx/store';
import { withUserFromAction } from './utils/with-user-from-action';
import { isProfilePage } from './utils/is-profile-page';
import { toSignal } from '@angular/core/rxjs-interop';
import { userId } from '../router/selectors';
import { CreateAndUploadImageCallbackParams } from 'model';

@Injectable()
export class AppEffect {
  private readonly actions$ = inject(Actions);
  private readonly platform = inject(Platform);
  private readonly api = inject(BiteTribeApiService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly store = inject(Store);
  private readonly navController = inject(NavController);
  private readonly analytics = inject(AnalyticsService);

  private readonly userId = toSignal(this.store.select(userId));

  loadSettingsFromApi$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.AuthActions.loadedUser),
      switchMap(() =>
        from(this.api.loadSettings()).pipe(
          tap((settings) => {
            const theme = settings?.theme;

            if (theme) {
              document.documentElement.classList.toggle(
                'dark',
                theme === 'dark',
              );
              document.documentElement.classList.toggle(
                'light',
                theme === 'light',
              );
            }
          }),
          map((settings) => AppActions.loadedSettingsFromAPI({ settings })),
        ),
      ),
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
      filter(
        (profile): profile is NonNullable<typeof profile> => profile !== null,
      ),
      map((profile) => AppActions.setPublicProfile({ profile })),
    );
  });

  initAfterLogin$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(fromAuth.AuthActions.loadedUser),
        stopIfUserIsUndefined(),
        dispatchGpsPosition(this.store),
        withUserFromAction(),
        initPushNotifications(this.platform, this.navController),
      ),
    { dispatch: false },
  );

  fetchGpsPosition$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.fetchGPSPosition, AppActions.reloadGPSPosition),
        dispatchGpsPosition(this.store),
      ),
    { dispatch: false },
  );

  updateUserMetadataAfterLogin$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(fromAuth.AuthActions.loadedUser),
        stopIfUserIsUndefined(),
        tap(() => {
          void this.api.updateUserMetadata();
          void this.syncEmailVerificationStatus('app_start');
        }),
      );
    },
    { dispatch: false },
  );

  updateUserMetadata$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(AppActions.updateUserMetadata),
        tap(() => {
          void this.api.updateUserMetadata();
        }),
      );
    },
    { dispatch: false },
  );

  syncEmailVerificationStatus$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(AppActions.syncEmailVerificationStatus),
        tap(() => {
          void this.syncEmailVerificationStatus('app_resume');
        }),
      );
    },
    { dispatch: false },
  );

  private async syncEmailVerificationStatus(
    source: 'app_start' | 'app_resume',
  ): Promise<void> {
    try {
      const metadata = await this.api.syncEmailVerificationStatus();
      this.store.dispatch(
        AppActions.syncedEmailVerificationStatus({ metadata }),
      );
      this.analytics.logEvent(AnalyticsEvent.EmailVerificationSynced, {
        verified: !!metadata.emailVerified,
        source,
      });
    } catch (error) {
      console.warn(
        `Error syncing email verification status (${source}):`,
        error,
      );
    }
  }

  saveProfileToFirestore$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.savePublicProfile),
      switchMap(({ profile }) => {
        if (isBase64String(profile.photoUrl)) {
          const { photoUrl, ...profileDocWithoutImage } = profile;

          return from(
            this.api.updateUser({ ...profileDocWithoutImage, photoUrl: '' }),
          ).pipe(
            map((updatedUser) => {
              return AppActions.savedPublicProfile({ profile: updatedUser });
            }),
            tap(({ profile }) => {
              this.store.dispatch(
                AppActions.uploadProfileImage({
                  profile: { ...profile, photoUrl },
                }),
              );
            }),
            catchError(() => of(AppActions.errorSavingPublicProfile())),
          );
        }

        return from(this.api.updateUser(profile)).pipe(
          map((updatedUser) => {
            return AppActions.savedPublicProfile({ profile: updatedUser });
          }),
          catchError(() => of(AppActions.errorSavingPublicProfile())),
        );
      }),
    );
  });

  uploadProfileImage$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(AppActions.uploadProfileImage),
        switchMap(({ profile }) => {
          return from(
            this.api.uploadProfileImage(
              profile,
              (p: CreateAndUploadImageCallbackParams): void => {
                if (p.uploadParams?.evt?.completed === false) {
                  this.store.dispatch(
                    AppActions.uploadingProfileImage({
                      progress: p.uploadParams,
                      profile,
                      imagePath: p.imagePath,
                    }),
                  );
                } else if (p.uploadParams?.evt?.completed === true) {
                  this.store.dispatch(
                    AppActions.uploadedProfileImage({
                      profile,
                      imagePath: p.imagePath,
                    }),
                  );
                }
              },
            ),
          ).pipe(
            catchError(() =>
              of(AppActions.errorUploadingProfileImage({ profile })),
            ),
          );
        }),
      );
    },
    { dispatch: false },
  );

  updatePhotoUrlInProfile$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.uploadedProfileImage),
      switchMap(({ profile, imagePath }) => {
        return from(this.api.updatePhotoUrlInUser(profile, imagePath)).pipe(
          map((updatedUser) => {
            return AppActions.updatedPhotoUrlInProfile({
              profile: updatedUser,
            });
          }),
          catchError(() =>
            of(AppActions.errorUpdatingPhotoUrlInProfile({ profile })),
          ),
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
        throttleTime(500),
        tap(async ({ user }) => {
          await this.api.followUser(user);

          this.store.dispatch(AppActions.followedUser());
        }),
      );
    },
    { dispatch: false },
  );

  unfollowUser$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(AppActions.unfollowUser),
        throttleTime(500),
        tap(async ({ user }) => {
          await this.api.unfollowUser(user);

          this.store.dispatch(AppActions.unfollowedUser());
        }),
      );
    },
    { dispatch: false },
  );

  fetchFollowMetadata$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(routerNavigatedAction, AppActions.reloadProfileMetadata),
        isProfilePage(),
        tap(async () => {
          const userId: string =
            this.userId() ?? this.storeService.user()?.uid ?? '';

          const metaData = await this.api.fetchFollowMetadata(userId);

          this.store.dispatch(AppActions.loadedProfileMetadata(metaData));
        }),
      );
    },
    { dispatch: false },
  );
}
