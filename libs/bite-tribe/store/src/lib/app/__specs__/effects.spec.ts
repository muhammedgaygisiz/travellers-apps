import { TestScheduler } from 'rxjs/testing';
import { defer, Observable, of, Subject, Subscription } from 'rxjs';
import { NavController, Platform } from '@ionic/angular';
import { provideMockActions } from '@ngrx/effects/testing';
import { TestBed } from '@angular/core/testing';
import { AnalyticsEvent, AnalyticsService, fromAuth } from 'ta-firestore';
import { AppActions } from '../actions';
import { AppEffect } from '../effects';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BiteTribeApiService } from 'bite-tribe/api';
import type { PublicUser, Settings } from 'model';
import { routerNavigatedAction } from '@ngrx/router-store';
import { BiteTribeStoreService } from '../../bite-tribe-store.service';
import { Action, Store } from '@ngrx/store';
import { getEffectsMetadata } from '@ngrx/effects';
import SpyInstance = jest.SpyInstance;
import { gpsPosition, publicUser } from '../selectors';
import { LocationPermissionNotGrantedError } from 'geolocation';
import { ToastService } from 'toast';
import { CelebrationService } from 'celebration';
import { TranslocoService } from '@jsverse/transloco';
import type { WeeklyLeaderboardSnapshot } from 'bite-tribe/api';
import { claimTopTenWeek } from '../utils/entered-top-ten';

// The once-a-week memory is `entered-top-ten.spec.ts`'s; here it only says yes
// or no, so the rule itself runs for real.
jest.mock('../utils/entered-top-ten', () => ({
  ...jest.requireActual('../utils/entered-top-ten'),
  claimTopTenWeek: jest.fn(),
}));

const getCurrentPositionMock = jest.fn();
jest.mock('geolocation', () => ({
  getCurrentPosition: (): void => getCurrentPositionMock(),
  // Mirrors the real error so the effect's `instanceof` branch is exercised
  // without pulling the Capacitor plugin into this spec.
  LocationPermissionNotGrantedError: class extends Error {
    constructor(readonly permissionState: string) {
      super('Location permission is not granted');
      this.name = 'LocationPermissionNotGrantedError';
    }
  },
}));

const assertDeepEqual = (actual: unknown, expected: unknown): void => {
  expect(actual).toEqual(expected);
};

const PlatformMock = {};

const BiteTribeApiServiceMock = {
  publicProfile$: of({ displayName: 'test' } as PublicUser),
  weeklyLeaderboard$: of() as Observable<WeeklyLeaderboardSnapshot>,
  loadSettings: jest.fn(),
  saveSettings: jest.fn(),
  saveUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  getExchangeRates: jest.fn(),
  reloadGPSPosition: jest.fn(),
  followUser: jest.fn(),
  followsAnyone: jest.fn(),
  getTotalNumberOfBites: jest.fn(),
  getTotalNumberOfUsers: jest.fn(),
  unfollowUser: jest.fn(),
  fetchFollowMetadata: jest.fn(),
  updateLastSeen: jest.fn(),
  updateUserMetadata: jest.fn(),
  syncEmailVerificationStatus: jest.fn(),
  blockUser: jest.fn(),
  unblockUser: jest.fn(),
  fetchBlockedUserIds: jest.fn(),
};

const ToastServiceMock = {
  present: jest.fn().mockResolvedValue(undefined),
};

const CelebrationServiceMock = {
  celebrate: jest.fn().mockResolvedValue(undefined),
};

const TranslocoServiceMock = {
  getActiveLang: jest.fn(() => 'en'),
};

const NavControllerMock = {};
const AnalyticsServiceMock = {
  logEvent: jest.fn(),
};

describe(AppEffect.name, () => {
  let scheduler: TestScheduler;
  let actions$: Observable<Action> = of({ type: 'INIT' });
  let effects: AppEffect;
  let apiService: BiteTribeApiService;
  let storeService: BiteTribeStoreService;
  let store: Store;
  let dispatchSpy: SpyInstance;

  beforeEach(() => {
    scheduler = new TestScheduler(assertDeepEqual);
    TestBed.configureTestingModule({
      providers: [
        AppEffect,
        provideMockActions(() => actions$),
        { provide: BiteTribeApiService, useValue: BiteTribeApiServiceMock },
        { provide: Platform, useValue: PlatformMock },
        { provide: NavController, useValue: NavControllerMock },
        { provide: AnalyticsService, useValue: AnalyticsServiceMock },
        { provide: ToastService, useValue: ToastServiceMock },
        { provide: CelebrationService, useValue: CelebrationServiceMock },
        { provide: TranslocoService, useValue: TranslocoServiceMock },
        provideMockStore(),
      ],
    });

    effects = TestBed.inject(AppEffect);
    apiService = TestBed.inject(BiteTribeApiService);
    storeService = TestBed.inject(BiteTribeStoreService);
    store = TestBed.inject(MockStore);

    const emailVerificationMetadata: Awaited<
      ReturnType<BiteTribeApiService['syncEmailVerificationStatus']>
    > = {
      emailVerified: false,
      emailVerificationRequired: true,
    };
    BiteTribeApiServiceMock.syncEmailVerificationStatus.mockResolvedValue(
      emailVerificationMetadata,
    );
    jest
      .spyOn(storeService, 'user')
      .mockReturnValue({ uid: '1' } as unknown as ReturnType<
        typeof storeService.user
      >);
    dispatchSpy = jest.spyOn(store, 'dispatch').mockImplementation();
  });

  describe('loadSettingsFromApi$', () => {
    beforeEach(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.remove('light');
    });

    describe('given settings with dark theme exist', () => {
      beforeEach(() => {
        jest
          .spyOn(apiService, 'loadSettings')
          .mockReturnValue(
            of({ theme: 'dark' }) as unknown as ReturnType<
              BiteTribeApiService['loadSettings']
            >,
          );
      });

      it('should load settings from API on fromAuth.AuthActions.loadedUser', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', { a: fromAuth.AuthActions.loadedUser });

          const expected = 'a';
          const output = {
            a: AppActions.loadedSettingsFromAPI({
              settings: { theme: 'dark' } as Settings,
            }),
          };

          expectObservable(effects.loadSettingsFromApi$).toBe(expected, output);
        });
      });

      it('should set dark theme on document element', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', { a: fromAuth.AuthActions.loadedUser });

          expectObservable(effects.loadSettingsFromApi$);
        });

        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.documentElement.classList.contains('light')).toBe(
          false,
        );
      });
    });

    describe('given settings without theme', () => {
      beforeEach(() => {
        jest
          .spyOn(apiService, 'loadSettings')
          .mockReturnValue(
            of({} as Settings) as unknown as ReturnType<
              BiteTribeApiService['loadSettings']
            >,
          );
      });

      it('should not set theme on document element', () => {
        scheduler.run(({ cold, expectObservable }) => {
          actions$ = cold('a', { a: fromAuth.AuthActions.loadedUser });

          expectObservable(effects.loadSettingsFromApi$);
        });

        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(document.documentElement.classList.contains('light')).toBe(
          false,
        );
      });
    });
  });

  describe('loadPublicProfile$', () => {
    it('should do nothing if user is not provided', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', { a: fromAuth.AuthActions.loadedUser });

        const expected = '-';

        expectObservable(effects.loadPublicProfile$).toBe(expected);
      });
    });

    it('should load public profile on fromAuth.loadedUser', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: fromAuth.AuthActions.loadedUser({
            user: {} as unknown as Parameters<
              typeof fromAuth.AuthActions.loadedUser
            >[0]['user'],
          }),
        });

        const expected = 'a';
        const output = {
          a: AppActions.setPublicProfile({
            profile: { displayName: 'test' } as unknown as Parameters<
              typeof AppActions.setPublicProfile
            >[0]['profile'],
          }),
        };

        expectObservable(effects.loadPublicProfile$).toBe(expected, output);
      });
    });
  });

  describe('celebrateProfileProgress$', () => {
    const signedIn = fromAuth.AuthActions.loadedUser({
      user: { uid: 'leela' } as unknown as Parameters<
        typeof fromAuth.AuthActions.loadedUser
      >[0]['user'],
    });
    const signedOut = fromAuth.AuthActions.loadedUser({
      user: undefined as unknown as Parameters<
        typeof fromAuth.AuthActions.loadedUser
      >[0]['user'],
    });

    let actions: Subject<Action>;
    let profiles: Subject<Partial<PublicUser>>;
    let subscription: Subscription;
    const originalProfile$ = BiteTribeApiServiceMock.publicProfile$;

    beforeEach(() => {
      CelebrationServiceMock.celebrate.mockClear();
      actions = new Subject<Action>();
      profiles = new Subject<Partial<PublicUser>>();
      actions$ = actions;
      BiteTribeApiServiceMock.publicProfile$ =
        profiles as unknown as Observable<PublicUser>;
      subscription = effects.celebrateProfileProgress$.subscribe();
    });

    afterEach(() => {
      subscription.unsubscribe();
      BiteTribeApiServiceMock.publicProfile$ = originalProfile$;
    });

    it('should have dispatch false set', () => {
      expect(
        getEffectsMetadata(effects).celebrateProfileProgress$?.dispatch,
      ).toBeFalsy();
    });

    it('celebrates a code a later snapshot adds, naming the country in the active language', () => {
      TranslocoServiceMock.getActiveLang.mockReturnValueOnce('de');
      actions.next(signedIn);
      profiles.next({ countryCodes: ['DE'] });
      profiles.next({ countryCodes: ['DE', 'ES'] });

      expect(CelebrationServiceMock.celebrate).toHaveBeenCalledTimes(1);
      expect(CelebrationServiceMock.celebrate).toHaveBeenCalledWith(
        'first-country',
        { country: 'Spanien' },
      );
    });

    it('celebrates nothing for the first snapshot after start-up', () => {
      actions.next(signedIn);
      profiles.next({ countryCodes: ['DE', 'JP'] });

      expect(CelebrationServiceMock.celebrate).not.toHaveBeenCalled();
    });

    it('celebrates nothing going from no codes to one', () => {
      actions.next(signedIn);
      profiles.next({ countryCodes: [] });
      profiles.next({ countryCodes: ['DE'] });

      expect(CelebrationServiceMock.celebrate).not.toHaveBeenCalled();
    });

    it('celebrates once for a snapshot that adds two codes', () => {
      actions.next(signedIn);
      profiles.next({ countryCodes: ['DE'] });
      profiles.next({ countryCodes: ['DE', 'JP', 'TH'] });

      expect(CelebrationServiceMock.celebrate).toHaveBeenCalledTimes(1);
    });

    it('celebrates nothing for a snapshot that removes a code', () => {
      actions.next(signedIn);
      profiles.next({ countryCodes: ['DE', 'JP'] });
      profiles.next({ countryCodes: ['DE'] });

      expect(CelebrationServiceMock.celebrate).not.toHaveBeenCalled();
    });

    it('starts a new baseline on each sign-in', () => {
      actions.next(signedIn);
      profiles.next({ countryCodes: ['DE'] });
      actions.next(signedIn);
      profiles.next({ countryCodes: ['DE', 'JP'] });

      expect(CelebrationServiceMock.celebrate).not.toHaveBeenCalled();
    });

    it.each([
      [4, 5],
      [49, 50],
      [199, 200],
      [999, 1000],
    ])(
      'celebrates the milestone a snapshot taking biteCount from %i to %i reaches',
      (previous, current) => {
        actions.next(signedIn);
        profiles.next({ biteCount: previous });
        profiles.next({ biteCount: current });

        expect(CelebrationServiceMock.celebrate).toHaveBeenCalledTimes(1);
        expect(CelebrationServiceMock.celebrate).toHaveBeenCalledWith(
          'bite-milestone',
          { count: current },
        );
      },
    );

    it.each([
      [5, 6],
      [149, 150],
      [200, 199],
    ])(
      'celebrates nothing for a snapshot taking biteCount from %i to %i',
      (previous, current) => {
        actions.next(signedIn);
        profiles.next({ biteCount: previous });
        profiles.next({ biteCount: current });

        expect(CelebrationServiceMock.celebrate).not.toHaveBeenCalled();
      },
    );

    it('celebrates the highest milestone a snapshot crosses, once', () => {
      actions.next(signedIn);
      profiles.next({ biteCount: 8 });
      profiles.next({ biteCount: 12 });

      expect(CelebrationServiceMock.celebrate).toHaveBeenCalledTimes(1);
      expect(CelebrationServiceMock.celebrate).toHaveBeenCalledWith(
        'bite-milestone',
        { count: 10 },
      );
    });

    it('celebrates no milestone for the first snapshot after sign-in', () => {
      actions.next(signedIn);
      profiles.next({ biteCount: 100 });

      expect(CelebrationServiceMock.celebrate).not.toHaveBeenCalled();
    });

    it('raises both moments of one snapshot and leaves the choice to the service', () => {
      actions.next(signedIn);
      profiles.next({ countryCodes: ['DE'], biteCount: 9 });
      profiles.next({ countryCodes: ['DE', 'ES'], biteCount: 10 });

      expect(CelebrationServiceMock.celebrate).toHaveBeenCalledTimes(2);
      expect(CelebrationServiceMock.celebrate).toHaveBeenCalledWith(
        'first-country',
        expect.anything(),
      );
      expect(CelebrationServiceMock.celebrate).toHaveBeenCalledWith(
        'bite-milestone',
        { count: 10 },
      );
    });

    it("opens one listener on the user's own document for both moments", () => {
      let listeners = 0;
      BiteTribeApiServiceMock.publicProfile$ = defer(() => {
        listeners += 1;
        return profiles;
      }) as unknown as Observable<PublicUser>;

      actions.next(signedIn);
      profiles.next({ countryCodes: ['DE'], biteCount: 4 });
      profiles.next({ countryCodes: ['DE', 'ES'], biteCount: 5 });

      expect(listeners).toBe(1);
      expect(CelebrationServiceMock.celebrate).toHaveBeenCalledTimes(2);
    });

    it('stops listening once signed out', () => {
      actions.next(signedIn);
      profiles.next({ countryCodes: ['DE'] });
      actions.next(signedOut);
      profiles.next({ countryCodes: ['DE', 'JP'] });

      expect(CelebrationServiceMock.celebrate).not.toHaveBeenCalled();
      expect(profiles.observed).toBe(false);
    });
  });

  describe('celebrateLeaderboardTopTen$', () => {
    const WEEK = '2026-11-09';
    const signedIn = fromAuth.AuthActions.loadedUser({
      user: { uid: 'leela' } as unknown as Parameters<
        typeof fromAuth.AuthActions.loadedUser
      >[0]['user'],
    });
    const signedOut = fromAuth.AuthActions.loadedUser({
      user: undefined as unknown as Parameters<
        typeof fromAuth.AuthActions.loadedUser
      >[0]['user'],
    });

    /** Ten other users with `counts`, and Leela at `rank` with `mine`. */
    const board = (
      counts: number[],
      leela?: { rank: number; count: number },
    ): WeeklyLeaderboardSnapshot => {
      const users = counts.map((biteCount, index) => ({
        userId: `u${index + 1}`,
        biteCount,
      }));

      if (leela) {
        users.splice(leela.rank - 1, 0, {
          userId: 'leela',
          biteCount: leela.count,
        });
      }

      return { week: WEEK, users: users.slice(0, 10) };
    };
    const FULL = [9, 8, 7, 6, 5, 4, 3, 3, 3, 3];

    let actions: Subject<Action>;
    let boards: Subject<WeeklyLeaderboardSnapshot>;
    let subscription: Subscription;
    const originalBoard$ = BiteTribeApiServiceMock.weeklyLeaderboard$;
    const flush = (): Promise<void> =>
      new Promise((resolve) => setTimeout(resolve, 0));

    beforeEach(() => {
      CelebrationServiceMock.celebrate.mockClear();
      jest.mocked(claimTopTenWeek).mockReset().mockResolvedValue(true);
      actions = new Subject<Action>();
      boards = new Subject<WeeklyLeaderboardSnapshot>();
      actions$ = actions;
      BiteTribeApiServiceMock.weeklyLeaderboard$ = boards;
      subscription = effects.celebrateLeaderboardTopTen$.subscribe();
    });

    afterEach(() => {
      subscription.unsubscribe();
      BiteTribeApiServiceMock.weeklyLeaderboard$ = originalBoard$;
    });

    it('should have dispatch false set', () => {
      expect(
        getEffectsMetadata(effects).celebrateLeaderboardTopTen$?.dispatch,
      ).toBeFalsy();
    });

    it('celebrates a snapshot that newly lists the user at #7 after a Bite of theirs', async () => {
      actions.next(signedIn);
      boards.next(board(FULL));
      boards.next(board([9, 8, 7, 6, 5, 4], { rank: 7, count: 4 }));
      await flush();

      expect(claimTopTenWeek).toHaveBeenCalledWith('leela', WEEK);
      expect(CelebrationServiceMock.celebrate).toHaveBeenCalledTimes(1);
      expect(CelebrationServiceMock.celebrate).toHaveBeenCalledWith(
        'leaderboard-top-ten',
        { rank: 7 },
      );
    });

    it('celebrates nothing for a snapshot that lists the user without their count having risen', async () => {
      actions.next(signedIn);
      boards.next(board(FULL));
      boards.next(board([8, 7, 6, 5, 4, 3, 3, 3, 3], { rank: 10, count: 3 }));
      await flush();

      expect(CelebrationServiceMock.celebrate).not.toHaveBeenCalled();
    });

    it('celebrates nothing for the first snapshot after sign-in', async () => {
      actions.next(signedIn);
      boards.next(board([9, 8], { rank: 3, count: 7 }));
      await flush();

      expect(CelebrationServiceMock.celebrate).not.toHaveBeenCalled();
    });

    it('celebrates nothing while the user stays in the top ten or drops out of it', async () => {
      actions.next(signedIn);
      boards.next(board([9, 8, 7], { rank: 4, count: 5 }));
      boards.next(board([9, 8], { rank: 3, count: 8 }));
      boards.next(board(FULL));
      await flush();

      expect(CelebrationServiceMock.celebrate).not.toHaveBeenCalled();
    });

    it('celebrates nothing for a week already celebrated on this device', async () => {
      jest.mocked(claimTopTenWeek).mockResolvedValue(false);
      actions.next(signedIn);
      boards.next(board(FULL));
      boards.next(board([9, 8, 7, 6, 5, 4], { rank: 7, count: 4 }));
      await flush();

      expect(CelebrationServiceMock.celebrate).not.toHaveBeenCalled();
    });

    it('stops listening to the leaderboard once signed out', async () => {
      actions.next(signedIn);
      boards.next(board(FULL));
      actions.next(signedOut);
      boards.next(board([9, 8, 7, 6, 5, 4], { rank: 7, count: 4 }));
      await flush();

      expect(CelebrationServiceMock.celebrate).not.toHaveBeenCalled();
      expect(boards.observed).toBe(false);
    });
  });

  describe('fetchGpsPosition$', () => {
    it('should have dispatch false set', () => {
      expect(
        getEffectsMetadata(effects).fetchGpsPosition$?.dispatch,
      ).toBeFalsy();
    });

    it('should dispatch loadedGpsPosition on successful location fetch', () => {
      scheduler.run(({ cold, expectObservable }) => {
        const position = { coords: { latitude: 1, longitude: 2 } };

        getCurrentPositionMock.mockReturnValue(cold('a|', { a: position }));

        actions$ = cold('a', { a: AppActions.fetchGPSPosition() });

        expectObservable(effects.fetchGpsPosition$);
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        AppActions.loadedGPSPosition({
          position: { coords: { latitude: 1, longitude: 2 } },
        }),
      );
    });

    it('should not dispatch loadedGpsPosition when movement is below threshold', () => {
      scheduler.run(({ cold, expectObservable }) => {
        const previousPosition = { latitude: 10, longitude: 20 };
        const smallMovementPosition = {
          coords: { latitude: 10.00001, longitude: 20.00001 },
        };

        (store as MockStore).overrideSelector(gpsPosition, previousPosition);
        getCurrentPositionMock.mockReturnValue(
          cold('a|', { a: smallMovementPosition }),
        );

        actions$ = cold('a', { a: AppActions.fetchGPSPosition() });

        expectObservable(effects.fetchGpsPosition$);
      });

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        AppActions.loadedGPSPosition({
          position: { coords: { latitude: 10.00001, longitude: 20.00001 } },
        }),
      );
    });

    it('should dispatch loadedGpsPosition when movement is meaningful', () => {
      scheduler.run(({ cold, expectObservable }) => {
        const previousPosition = { latitude: 10, longitude: 20 };
        const meaningfulMovementPosition = {
          coords: { latitude: 10.002, longitude: 20.002 },
        };

        (store as MockStore).overrideSelector(gpsPosition, previousPosition);
        getCurrentPositionMock.mockReturnValue(
          cold('a|', { a: meaningfulMovementPosition }),
        );

        actions$ = cold('a', { a: AppActions.fetchGPSPosition() });

        expectObservable(effects.fetchGpsPosition$);
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        AppActions.loadedGPSPosition({
          position: { coords: { latitude: 10.002, longitude: 20.002 } },
        }),
      );
    });

    it('refreshes the marker without a reload when movement is below threshold', () => {
      const smallMovementPosition = {
        coords: { latitude: 10.00001, longitude: 20.00001 },
      };

      scheduler.run(({ cold, expectObservable }) => {
        const previousPosition = { latitude: 10, longitude: 20 };

        (store as MockStore).overrideSelector(gpsPosition, previousPosition);
        getCurrentPositionMock.mockReturnValue(
          cold('a|', { a: smallMovementPosition }),
        );

        actions$ = cold('a', { a: AppActions.fetchGPSPosition() });

        expectObservable(effects.fetchGpsPosition$);
      });

      // The fresh position is applied so the map marker follows the user, but
      // no bite refetch is triggered (that only rides on loadedGPSPosition).
      expect(dispatchSpy).toHaveBeenCalledWith(
        AppActions.updatedGPSPositionWithoutReload({
          position: smallMovementPosition,
        }),
      );
      expect(dispatchSpy).not.toHaveBeenCalledWith(
        AppActions.loadedGPSPosition({ position: smallMovementPosition }),
      );
    });

    it('should emit errorLoadingGpsPosition and show alert on error', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('GPS Error');
      scheduler.run(({ cold, expectObservable }) => {
        getCurrentPositionMock.mockReturnValue(cold('#', {}, error));

        actions$ = cold('a', { a: AppActions.fetchGPSPosition() });

        const expected = 'a';
        const output = { a: AppActions.fetchGPSPosition() };

        expectObservable(effects.fetchGpsPosition$).toBe(expected, output);
      });

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(
        AppActions.errorLoadingGPSPosition({
          error,
          permissionState: undefined,
        }),
      );

      errorSpy.mockRestore();
    });

    // The read refuses to prompt, so it is the only place that already knows
    // whether the OS still has a prompt left or only settings can help.
    it('should forward the permission state that blocked the read', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new LocationPermissionNotGrantedError('denied');

      scheduler.run(({ cold, expectObservable }) => {
        getCurrentPositionMock.mockReturnValue(cold('#', {}, error));

        actions$ = cold('a', { a: AppActions.fetchGPSPosition() });

        expectObservable(effects.fetchGpsPosition$).toBe('a', {
          a: AppActions.fetchGPSPosition(),
        });
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        AppActions.errorLoadingGPSPosition({
          error,
          permissionState: 'denied',
        }),
      );

      errorSpy.mockRestore();
    });
  });

  describe('loadExchangeRatesFromApi$', () => {
    beforeEach(() => {
      jest
        .spyOn(apiService, 'getExchangeRates')
        .mockReturnValue(
          of({ USD: 1, EUR: 0.85 }) as unknown as ReturnType<
            BiteTribeApiService['getExchangeRates']
          >,
        );
    });

    it('should load exchange rates from API on fromAuth.loadedUser', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: fromAuth.AuthActions.loadedUser({
            user: {} as unknown as Parameters<
              typeof fromAuth.AuthActions.loadedUser
            >[0]['user'],
          }),
        });

        const expected = 'a';
        const output = {
          a: AppActions.loadedExchangeRatesFromAPI({
            exchangeRates: { USD: 1, EUR: 0.85 },
          }),
        };

        expectObservable(effects.loadExchangeRatesFromApi$).toBe(
          expected,
          output,
        );
      });
    });
  });

  describe('reloadGpsOnPageChangeToCreateBite$', () => {
    let reloadGPSPositionSpy: SpyInstance;

    beforeEach(() => {
      reloadGPSPositionSpy = jest
        .spyOn(storeService, 'reloadGPSPosition')
        .mockImplementation();
    });

    it('should call reloadGPSPosition from Store Service', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: routerNavigatedAction({
            payload: { event: { urlAfterRedirects: '/new-bite' } },
          } as unknown as Parameters<typeof routerNavigatedAction>[0]),
        });

        expectObservable(effects.reloadGpsOnPageChangeToCreateBite$);
      });

      expect(reloadGPSPositionSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('followUser$', () => {
    const user = { userId: 'user-id', displayName: 'leela' } as PublicUser;
    let actions: Subject<Action>;
    let subscription: Subscription;

    /** Lets the effect's awaits settle. */
    const settled = async (): Promise<void> => {
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
      }
    };

    beforeEach(() => {
      CelebrationServiceMock.celebrate.mockClear();
      BiteTribeApiServiceMock.followsAnyone.mockResolvedValue(true);
      BiteTribeApiServiceMock.followUser.mockResolvedValue(true);
      actions = new Subject<Action>();
      actions$ = actions;
      subscription = effects.followUser$.subscribe();
    });

    afterEach(() => subscription.unsubscribe());

    it('follows the user and reports it', async () => {
      actions.next(AppActions.followUser({ user }));
      await settled();

      expect(BiteTribeApiServiceMock.followUser).toHaveBeenCalledWith(user);
      expect(dispatchSpy).toHaveBeenCalledWith(AppActions.followedUser());
    });

    it('celebrates the first follow by display name', async () => {
      BiteTribeApiServiceMock.followsAnyone.mockResolvedValue(false);

      actions.next(AppActions.followUser({ user }));
      await settled();

      expect(CelebrationServiceMock.celebrate).toHaveBeenCalledTimes(1);
      expect(CelebrationServiceMock.celebrate).toHaveBeenCalledWith(
        'first-follow',
        { user: 'leela' },
      );
    });

    it('asks before the write, which would count as a follow', async () => {
      const order: string[] = [];
      BiteTribeApiServiceMock.followsAnyone.mockImplementation(async () => {
        order.push('followsAnyone');
        return false;
      });
      BiteTribeApiServiceMock.followUser.mockImplementation(async () => {
        order.push('followUser');
        return true;
      });

      actions.next(AppActions.followUser({ user }));
      await settled();

      expect(order).toEqual(['followsAnyone', 'followUser']);
    });

    it('celebrates nothing for a later follow', async () => {
      actions.next(AppActions.followUser({ user }));
      await settled();

      expect(CelebrationServiceMock.celebrate).not.toHaveBeenCalled();
    });

    it('celebrates nothing when it cannot tell', async () => {
      BiteTribeApiServiceMock.followsAnyone.mockResolvedValue(undefined);

      actions.next(AppActions.followUser({ user }));
      await settled();

      expect(CelebrationServiceMock.celebrate).not.toHaveBeenCalled();
    });

    it('celebrates nothing when the follow fails', async () => {
      BiteTribeApiServiceMock.followsAnyone.mockResolvedValue(false);
      BiteTribeApiServiceMock.followUser.mockResolvedValue(false);

      actions.next(AppActions.followUser({ user }));
      await settled();

      expect(CelebrationServiceMock.celebrate).not.toHaveBeenCalled();
    });
  });

  describe('unfollowUser', () => {
    let unfollowUserSpy: SpyInstance;

    beforeEach(() => {
      unfollowUserSpy = jest
        .spyOn(apiService, 'unfollowUser')
        .mockImplementation();
    });

    it('should call unfollowUser from Store Service', () => {
      scheduler.run(({ cold, expectObservable }) => {
        const user = { userId: 'user-id' } as PublicUser;
        actions$ = cold('a', {
          a: AppActions.unfollowUser({ user }),
        });

        expectObservable(effects.unfollowUser$);
      });

      expect(unfollowUserSpy).toHaveBeenCalledTimes(1);
    });
  });

  // GitHub issue #1609.
  describe('blockUser$', () => {
    const user = { userId: 'blocked-id', displayName: 'Blocked' } as PublicUser;

    beforeEach(() => ToastServiceMock.present.mockClear());

    it('records the block once the backend has written it', async () => {
      BiteTribeApiServiceMock.blockUser.mockResolvedValue(undefined);
      actions$ = of(AppActions.blockUser({ user }));

      const emitted: Action[] = [];
      await new Promise<void>((resolve) =>
        effects.blockUser$.subscribe({
          next: (action) => emitted.push(action),
          complete: resolve,
        }),
      );

      expect(BiteTribeApiServiceMock.blockUser).toHaveBeenCalledWith(
        'blocked-id',
      );
      expect(emitted).toEqual([
        AppActions.blockedUser({ userId: 'blocked-id' }),
      ]);
      expect(ToastServiceMock.present).toHaveBeenCalledWith(
        expect.objectContaining({ messageKey: 'user-blocked' }),
      );
    });

    it('records nothing and says so when the block fails', async () => {
      BiteTribeApiServiceMock.blockUser.mockRejectedValue(new Error('nope'));
      actions$ = of(AppActions.blockUser({ user }));

      const emitted: Action[] = [];
      await new Promise<void>((resolve) =>
        effects.blockUser$.subscribe({
          next: (action) => emitted.push(action),
          complete: resolve,
        }),
      );

      expect(emitted).toEqual([]);
      expect(ToastServiceMock.present).toHaveBeenCalledWith(
        expect.objectContaining({
          messageKey: 'user-block-failed',
          outcome: 'failure',
        }),
      );
    });
  });

  describe('unblockUser$', () => {
    it('records the unblock once the backend has written it', async () => {
      const user = { userId: 'blocked-id' } as PublicUser;
      BiteTribeApiServiceMock.unblockUser.mockResolvedValue(undefined);
      actions$ = of(AppActions.unblockUser({ user }));

      const emitted: Action[] = [];
      await new Promise<void>((resolve) =>
        effects.unblockUser$.subscribe({
          next: (action) => emitted.push(action),
          complete: resolve,
        }),
      );

      expect(emitted).toEqual([
        AppActions.unblockedUser({ userId: 'blocked-id' }),
      ]);
    });
  });

  describe('loadBlockedUsers$', () => {
    it('loads the block list after login', async () => {
      BiteTribeApiServiceMock.fetchBlockedUserIds.mockResolvedValue(['a']);
      actions$ = of(
        fromAuth.AuthActions.loadedUser({
          user: { uid: '1' } as never,
        }),
      );

      const emitted: Action[] = [];
      await new Promise<void>((resolve) =>
        effects.loadBlockedUsers$.subscribe({
          next: (action) => emitted.push(action),
          complete: resolve,
        }),
      );

      expect(emitted).toEqual([
        AppActions.loadedBlockedUsers({ userIds: ['a'] }),
      ]);
    });
  });

  describe('updateUserMetadata effects', () => {
    let updateUserMetadataSpy: SpyInstance;

    beforeEach(() => {
      updateUserMetadataSpy = jest
        .spyOn(apiService, 'updateUserMetadata')
        .mockImplementation();
      updateUserMetadataSpy.mockClear();
    });

    it('should call updateUserMetadata on loadedUser', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: fromAuth.AuthActions.loadedUser({
            user: {} as unknown as Parameters<
              typeof fromAuth.AuthActions.loadedUser
            >[0]['user'],
          }),
        });

        expectObservable(effects.updateUserMetadataAfterLogin$);
      });

      expect(updateUserMetadataSpy).toHaveBeenCalledTimes(1);
    });

    it('should not call updateUserMetadata when loadedUser has no user', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: fromAuth.AuthActions.loadedUser({ user: null }),
        });

        expectObservable(effects.updateUserMetadataAfterLogin$);
      });

      expect(updateUserMetadataSpy).not.toHaveBeenCalled();
    });

    it('should call updateUserMetadata on AppActions.updateUserMetadata', () => {
      updateUserMetadataSpy.mockClear();
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: AppActions.updateUserMetadata(),
        });

        expectObservable(effects.updateUserMetadata$);
      });

      expect(updateUserMetadataSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('syncEmailVerificationStatus effects', () => {
    const pendingUser = {
      emailVerificationRequired: true,
      emailVerified: false,
    } as PublicUser;

    const flushPromises = (): Promise<void> =>
      new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

    const emitLoadedUser = (): void => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: fromAuth.AuthActions.loadedUser({
            user: {} as unknown as Parameters<
              typeof fromAuth.AuthActions.loadedUser
            >[0]['user'],
          }),
        });

        expectObservable(effects.updateUserMetadataAfterLogin$);
      });
    };

    beforeEach(() => {
      jest.spyOn(apiService, 'updateUserMetadata').mockImplementation();
      BiteTribeApiServiceMock.syncEmailVerificationStatus.mockClear();
      AnalyticsServiceMock.logEvent.mockClear();
      dispatchSpy.mockClear();
    });

    it('should sync on loadedUser when the verification is still pending', async () => {
      store.overrideSelector(publicUser, pendingUser);
      store.refreshState();

      emitLoadedUser();
      await flushPromises();

      expect(
        BiteTribeApiServiceMock.syncEmailVerificationStatus,
      ).toHaveBeenCalledTimes(1);
      expect(AnalyticsServiceMock.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.EmailVerificationSynced,
        { verified: false, source: 'app_start' },
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        AppActions.syncedEmailVerificationStatus({
          metadata: { emailVerified: false, emailVerificationRequired: true },
        }),
      );
    });

    it('should not sync on loadedUser when the user is already verified', async () => {
      store.overrideSelector(publicUser, {
        emailVerificationRequired: true,
        emailVerified: true,
      } as PublicUser);
      store.refreshState();

      emitLoadedUser();
      await flushPromises();

      expect(
        BiteTribeApiServiceMock.syncEmailVerificationStatus,
      ).not.toHaveBeenCalled();
      expect(AnalyticsServiceMock.logEvent).not.toHaveBeenCalled();
    });

    it('should not sync for a user who is never asked to verify', async () => {
      // Google and Apple sign-ins are classified as verified without ever
      // being sent a verification mail.
      store.overrideSelector(publicUser, {
        emailVerificationRequired: false,
        emailVerified: true,
      } as PublicUser);
      store.refreshState();

      emitLoadedUser();
      await flushPromises();

      expect(
        BiteTribeApiServiceMock.syncEmailVerificationStatus,
      ).not.toHaveBeenCalled();
    });

    it('should wait for the profile document before deciding on a cold start', async () => {
      store.overrideSelector(publicUser, undefined);
      store.refreshState();

      emitLoadedUser();
      await flushPromises();

      expect(
        BiteTribeApiServiceMock.syncEmailVerificationStatus,
      ).not.toHaveBeenCalled();

      store.overrideSelector(publicUser, pendingUser);
      store.refreshState();
      await flushPromises();

      expect(
        BiteTribeApiServiceMock.syncEmailVerificationStatus,
      ).toHaveBeenCalledTimes(1);
    });

    it('should sync on AppActions.syncEmailVerificationStatus when pending', async () => {
      store.overrideSelector(publicUser, pendingUser);
      store.refreshState();

      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: AppActions.syncEmailVerificationStatus(),
        });

        expectObservable(effects.syncEmailVerificationStatus$);
      });
      await flushPromises();

      expect(
        BiteTribeApiServiceMock.syncEmailVerificationStatus,
      ).toHaveBeenCalledTimes(1);
      expect(AnalyticsServiceMock.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.EmailVerificationSynced,
        { verified: false, source: 'app_resume' },
      );
    });

    it('should not sync on AppActions.syncEmailVerificationStatus when verified', async () => {
      store.overrideSelector(publicUser, {
        emailVerificationRequired: true,
        emailVerified: true,
      } as PublicUser);
      store.refreshState();

      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: AppActions.syncEmailVerificationStatus(),
        });

        expectObservable(effects.syncEmailVerificationStatus$);
      });
      await flushPromises();

      expect(
        BiteTribeApiServiceMock.syncEmailVerificationStatus,
      ).not.toHaveBeenCalled();
    });
  });

  describe('fetchFollowMetadata$', () => {
    let fetchFollowMetadataSpy: SpyInstance;

    beforeEach(() => {
      fetchFollowMetadataSpy = jest
        .spyOn(apiService, 'fetchFollowMetadata')
        .mockImplementation();
    });

    it('should call fetchFollowMetadataSpy from Api Service', () => {
      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: routerNavigatedAction({
            payload: { event: { urlAfterRedirects: '/profile/user-id' } },
          } as unknown as Parameters<typeof routerNavigatedAction>[0]),
        });

        expectObservable(effects.fetchFollowMetadata$);
      });

      expect(fetchFollowMetadataSpy).toHaveBeenCalledTimes(1);
    });
  });
});
