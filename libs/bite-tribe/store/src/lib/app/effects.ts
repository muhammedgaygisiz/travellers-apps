import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { AppActions } from './actions';
import {
  catchError,
  concatMap,
  EMPTY,
  exhaustMap,
  filter,
  from,
  map,
  of,
  pairwise,
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
import { ToastService } from 'toast';
import { CelebrationService } from 'celebration';
import { TranslocoService } from '@jsverse/transloco';
import { newCountryCode } from './utils/new-country-codes';
import { reachedBiteMilestone } from './utils/bite-milestone';
import { weeklyAwardToCelebrate } from './utils/weekly-award-to-celebrate';
import { claimTopTenWeek, enteredTopTen } from './utils/entered-top-ten';
import { overtookInTopTen } from './utils/overtook-in-top-ten';
import type { WeeklyBadge } from 'model';

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
   * current by the reducer instead. `celebrateProfileProgress$` holds its own
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
   * Celebrates what a Bite earns once the backend has counted it, while the
   * app runs: a first Bite in a new country (issue #1797) and a Bite-count
   * milestone (issue #2014).
   *
   * The phone knows neither when the post succeeds: the backend derives the
   * country from the position a few seconds later and adds it to the user's
   * `countryCodes`, and `incrementBiteCountOnBiteCreate` raises `biteCount`.
   * So this keeps the user's own document listened to for the session - one
   * listener, one read per change to it - and compares each snapshot with the
   * one before. Each sign-in starts a new baseline, so a start-up never
   * celebrates what was earned while the app was closed; see `newCountryCode`
   * and `reachedBiteMilestone` for what is and is not celebrated. When one
   * Bite earns both, `CelebrationService` plays only the higher one.
   *
   * The `countryBadge.title` push for the same badge is not shown on top while
   * the app is in the foreground: neither app configures `presentationOptions`
   * for `PushNotifications`, so the plugin presents nothing in the foreground
   * and only reports the push to its listener.
   */
  celebrateProfileProgress$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(fromAuth.AuthActions.loadedUser),
        switchMap(({ user }) =>
          user ? this.api.publicProfile$.pipe(pairwise()) : EMPTY,
        ),
        tap(([previous, current]) => {
          const countryCode = newCountryCode(
            previous.countryCodes,
            current.countryCodes,
          );
          const milestone = reachedBiteMilestone(
            previous.biteCount,
            current.biteCount,
          );

          if (countryCode) {
            void this.celebration.celebrate('first-country', {
              country: getLocalizedCountryName(
                countryCode,
                this.transloco.getActiveLang(),
              ),
            });
          }

          if (milestone) {
            void this.celebration.celebrate('bite-milestone', {
              count: milestone,
            });
          }
        }),
      ),
    { dispatch: false },
  );

  /**
   * Celebrates entering the weekly leaderboard's top ten, and passing somebody
   * inside it, while the app runs (issues #2015 and #2016).
   *
   * `rebuildWeeklyLeaderboard` rewrites `/meta/leaderboardWeekly` seconds
   * after `incrementBiteCountOnBiteCreate` counts a Bite, and every member may
   * read it, so this keeps it listened to for the session and compares each
   * snapshot with the one before. That costs one read per rewrite of the board
   * per open app, the same posture as the user's own document in
   * `celebrateProfileProgress$`. The first snapshot after sign-in only sets the
   * baseline; signing out removes the listener. See `enteredTopTen` for what
   * counts as entering - a place freed by somebody else does not - and
   * `claimTopTenWeek` for why it plays at most once per week.
   *
   * The same listener celebrates passing somebody inside the top ten (issue
   * #2016) - see `overtookInTopTen` - and opens no second one. A snapshot that
   * celebrates entering never also celebrates a pass, and only the user who
   * climbed celebrates: being passed shows nothing. Only the **This week**
   * board celebrates; All time celebrates nothing.
   * `CelebrationService` lets a higher moment of the same Bite win.
   */
  celebrateLeaderboardTopTen$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(fromAuth.AuthActions.loadedUser),
        switchMap(({ user }) => {
          const uid = user?.uid;

          if (!uid) {
            return EMPTY;
          }

          return this.api.weeklyLeaderboard$.pipe(
            pairwise(),
            concatMap(([previous, current]) => {
              const rank = enteredTopTen(previous, current, uid);

              if (rank !== undefined) {
                return from(claimTopTenWeek(uid, current.week)).pipe(
                  filter(Boolean),
                  map(() => ({
                    moment: 'leaderboard-top-ten' as const,
                    params: { rank } as Record<string, unknown>,
                  })),
                );
              }

              const overtake = overtookInTopTen(previous, current, uid);

              return overtake
                ? of({
                    moment: 'leaderboard-overtake' as const,
                    params: { ...overtake } as Record<string, unknown>,
                  })
                : EMPTY;
            }),
          );
        }),
        tap(({ moment, params }) => {
          void this.celebration.celebrate(moment, params);
        }),
      ),
    { dispatch: false },
  );

  /**
   * Celebrates a weekly top-3 finish the first time the app opens after the
   * Monday reset awarded it (issue #2031). The badge is on the login
   * snapshot of the user's own document, so no listener is added for it; the
   * push already told the user at the reset.
   */
  celebrateWeeklyAward$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AppActions.setPublicProfile),
        concatMap(({ profile }) => from(weeklyAwardToCelebrate(profile))),
        filter((badge): badge is WeeklyBadge => !!badge),
        tap((badge) => {
          void this.celebration.celebrate(
            badge.board === 'thisWeek'
              ? 'weekly-award-bites'
              : 'weekly-award-liked',
            { place: badge.place },
          );
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
