import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AppActions } from './actions';
import {
  catchError,
  EMPTY,
  exhaustMap,
  filter,
  from,
  map,
  of,
  switchMap,
  take,
  tap,
  throttleTime,
} from 'rxjs';
import { Platform } from '@ionic/angular';
import { BiteTribeApiService } from 'bite-tribe/api';
import { AnalyticsEvent, AnalyticsService, fromAuth } from 'ta-firestore';
import { routerNavigatedAction } from '@ngrx/router-store';
import { BiteTribeStoreService } from '../bite-tribe-store.service';
import {
  getLocalizedCountryName,
  isBase64String,
  isEmailVerificationPromptVisible,
  PATH,
} from 'utils';
import { stopIfUserIsUndefined } from './utils/stop-if-user-is-undefined';
import { dispatchGpsPosition } from './utils/dispatch-gps-position';
import {
  clearNotificationsForSurface,
  toNotificationSurface,
} from 'push-notifications';
import { initPushNotifications } from './utils/init-push-notifications';
import { PushNavigationService } from './push-navigation.service';
import { Store } from '@ngrx/store';
import { withUserFromAction } from './utils/with-user-from-action';
import { isProfilePage } from './utils/is-profile-page';
import { toSignal } from '@angular/core/rxjs-interop';
import { userId } from '../router/selectors';
import { publicUser } from './selectors';
import { CreateAndUploadImageCallbackParams } from 'model';
import { ToastService } from 'toast';
import { CelebrationService } from 'celebration';
import { TranslocoService } from '@jsverse/transloco';
import { newCountryCodes } from './utils/new-country-codes';

@Injectable()
export class AppEffect {
  private readonly actions$ = inject(Actions);
  private readonly platform = inject(Platform);
  private readonly api = inject(BiteTribeApiService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly store = inject(Store);
  private readonly analytics = inject(AnalyticsService);
  private readonly pushNavigation = inject(PushNavigationService);
  private readonly toast = inject(ToastService);
  private readonly celebration = inject(CelebrationService);
  private readonly transloco = inject(TranslocoService);

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

  /**
   * Takes one snapshot of the signed-in user's document at login.
   *
   * The `take(1)` is deliberate, and it is also what bounds the cost: the
   * source is a Firestore snapshot listener that bills a read per change, so
   * unsubscribing here removes it rather than leaving it to bill for updates
   * this effect would never read. The profile the store holds is therefore a
   * login-time snapshot, and server-maintained aggregates on it are kept
   * current by the reducer instead. `celebrateFirstCountry$` holds its own
   * subscription for the session, which feeds the celebration and not this
   * slice. See [[Architecture - State Management]].
   */
  loadPublicProfile$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.AuthActions.loadedUser),
      stopIfUserIsUndefined(),
      switchMap(() => this.api.publicProfile$.pipe(take(1))),
      map((profile) => AppActions.setPublicProfile({ profile })),
    );
  });

  /**
   * Celebrates a first Bite in a new country while the app runs (issue #1797).
   *
   * The phone does not know the country when the post succeeds: the backend
   * derives it from the position a few seconds later and adds it to the user's
   * `countryCodes`. So this keeps the user's own document listened to for the
   * session - one read per change to it - and celebrates when a snapshot adds
   * a code. Each sign-in starts a new baseline; see `newCountryCodes` for what
   * is and is not celebrated.
   *
   * The `countryBadge.title` push for the same badge is not shown on top while
   * the app is in the foreground: neither app configures `presentationOptions`
   * for `PushNotifications`, so the plugin presents nothing in the foreground
   * and only reports the push to its listener.
   */
  celebrateFirstCountry$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(fromAuth.AuthActions.loadedUser),
        switchMap(({ user }) =>
          user ? this.api.publicProfile$.pipe(newCountryCodes()) : EMPTY,
        ),
        tap((countryCode) => {
          void this.celebration.celebrate('first-country', {
            country: getLocalizedCountryName(
              countryCode,
              this.transloco.getActiveLang(),
            ),
          });
        }),
      ),
    { dispatch: false },
  );

  initAfterLogin$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(fromAuth.AuthActions.loadedUser),
        stopIfUserIsUndefined(),
        dispatchGpsPosition(this.store),
        withUserFromAction(),
        initPushNotifications(this.platform, this.pushNavigation),
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
          this.syncEmailVerificationStatusIfPending('app_start');
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
          this.syncEmailVerificationStatusIfPending('app_resume');
        }),
      );
    },
    { dispatch: false },
  );

  /**
   * Runs the sync only while a verification is actually outstanding.
   *
   * The callable costs an Auth lookup plus a Firestore read and write, and for
   * everyone else it re-confirms on every start and every resume a state that
   * cannot change while they stay signed in: verified users never become
   * unverified, and the Google/Apple sign-ins are classified as verified
   * without ever being asked (issue #1254). The once-a-day `updateUserMetadata`
   * refresh rebuilds the same metadata from the same helper, so a document this
   * skips still reconciles on its own.
   */
  private syncEmailVerificationStatusIfPending(
    source: 'app_start' | 'app_resume',
  ): void {
    this.store
      .select(publicUser)
      .pipe(
        // On a cold start the profile document arrives after `loadedUser`, so
        // the check waits for it instead of reading an empty slice and
        // concluding there is nothing to verify.
        filter((user) => !!user),
        take(1),
      )
      .subscribe((user) => {
        if (!isEmailVerificationPromptVisible(user)) {
          return;
        }

        void this.syncEmailVerificationStatus(source);
      });
  }

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

  /**
   * Dismisses the notifications about a surface once the user is looking at it.
   *
   * The OS only clears the notification that was tapped, so a Bite opened from
   * the feed leaves the notification announcing it in the drawer for good. That
   * is what lets a backlog build up rather than drain (issue \#1366).
   *
   * It runs on navigation rather than in each page so the rule stays one rule:
   * a page cannot forget to clear, and a new notification type only has to name
   * the surface its route already has.
   */
  clearNotificationsOnPageChangeToSurface$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(routerNavigatedAction),
        map((action) =>
          toNotificationSurface(
            action.payload.event.urlAfterRedirects,
            this.storeService.user()?.uid,
          ),
        ),
        filter((surface): surface is string => !!surface),
        tap(
          async (surface) =>
            await clearNotificationsForSurface(this.platform, surface),
        ),
      );
    },
    { dispatch: false },
  );

  /**
   * Follows from a profile. The first person a user follows is celebrated
   * (issue #1799), and the follow suggestions celebrate theirs the same way.
   * Whether it is the first is asked before the write, which would count as
   * one; an answer that cannot be told is not taken for none.
   */
  followUser$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(AppActions.followUser),
        throttleTime(500),
        tap(async ({ user }) => {
          const followedAnybody = await this.api.followsAnyone();
          const followed = await this.api.followUser(user);

          this.store.dispatch(AppActions.followedUser());

          if (followed && followedAnybody === false) {
            void this.celebration.celebrate('first-follow', {
              user: user.displayName,
            });
          }
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

  /**
   * The signed-in user's block list, read once per login (GitHub issue #1609).
   * The block and unblock effects keep it current afterwards, so it needs no
   * listener of its own.
   */
  loadBlockedUsers$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.AuthActions.loadedUser),
      stopIfUserIsUndefined(),
      switchMap(() => from(this.api.fetchBlockedUserIds())),
      map((userIds) => AppActions.loadedBlockedUsers({ userIds })),
    );
  });

  /**
   * The store only learns of a block once the backend has written it, unlike
   * the optimistic follow: a block that silently failed would leave the user
   * believing an account is gone from their app while it is not. A second tap
   * while the first is in flight is dropped.
   */
  blockUser$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.blockUser),
      exhaustMap(({ user }) =>
        from(this.api.blockUser(user.userId)).pipe(
          map(() => {
            void this.toast.present({
              messageKey: 'user-blocked',
              params: { username: user.displayName },
              outcome: 'success',
            });

            return AppActions.blockedUser({ userId: user.userId });
          }),
          catchError(() => {
            void this.toast.present({
              messageKey: 'user-block-failed',
              outcome: 'failure',
            });

            return EMPTY;
          }),
        ),
      ),
    );
  });

  unblockUser$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.unblockUser),
      exhaustMap(({ user }) =>
        from(this.api.unblockUser(user.userId)).pipe(
          map(() => {
            void this.toast.present({
              messageKey: 'user-unblocked',
              params: { username: user.displayName },
              outcome: 'success',
            });

            return AppActions.unblockedUser({ userId: user.userId });
          }),
          catchError(() => {
            void this.toast.present({
              messageKey: 'user-unblock-failed',
              outcome: 'failure',
            });

            return EMPTY;
          }),
        ),
      ),
    );
  });

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
