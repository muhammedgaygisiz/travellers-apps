import { TestBed } from '@angular/core/testing';
import { ProfileApiService, SettingsApiService } from 'bite-tribe/api';
import { BiteTribeStoreService } from 'bite-tribe/store';
import type { FollowSuggestion, PublicUser, Settings } from 'model';
import { BehaviorSubject, of } from 'rxjs';
import { AnalyticsService } from 'ta-firestore';
import { ToastService } from 'toast';
import {
  FOLLOW_SUGGESTIONS_DISMISS_MS,
  FollowSuggestionsService,
} from '../follow-suggestions.service';

const getLocationPermissionState = jest.fn();
const getCurrentPosition = jest.fn();

jest.mock('geolocation', () => ({
  getLocationPermissionState: (): unknown => getLocationPermissionState(),
  getCurrentPosition: (): unknown => getCurrentPosition(),
}));

const ana: FollowSuggestion = {
  userId: 'ana',
  displayName: 'Ana',
  biteCount: 4,
  reason: 'nearby',
};
const ben: FollowSuggestion = {
  userId: 'ben',
  displayName: 'Ben',
  biteCount: 2,
  reason: 'active',
};

describe(FollowSuggestionsService.name, () => {
  let service: FollowSuggestionsService;
  let profile$: BehaviorSubject<Partial<PublicUser> | undefined>;
  let settings$: BehaviorSubject<Partial<Settings> | undefined>;
  let position$: BehaviorSubject<
    { latitude: number; longitude: number } | undefined
  >;
  const profileApi = {
    fetchFollowSuggestions: jest.fn(),
    follow: jest.fn(),
  };
  const settingsApi = { mergeSettings: jest.fn() };
  const notifySavedSettings = jest.fn();
  const logEvent = jest.fn();
  const present = jest.fn();

  const settle = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve));
  };

  const create = (): void => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ProfileApiService, useValue: profileApi },
        { provide: SettingsApiService, useValue: settingsApi },
        {
          provide: BiteTribeStoreService,
          useValue: {
            userId$: of('viewer'),
            publicUser$: profile$,
            settings$,
            position$,
            notifySavedSettings,
          },
        },
        { provide: AnalyticsService, useValue: { logEvent } },
        { provide: ToastService, useValue: { present } },
      ],
    });
    service = TestBed.inject(FollowSuggestionsService);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    profile$ = new BehaviorSubject<Partial<PublicUser> | undefined>({
      followingCount: 0,
    });
    settings$ = new BehaviorSubject<Partial<Settings> | undefined>({
      currency: 'CHF',
    });
    position$ = new BehaviorSubject<
      { latitude: number; longitude: number } | undefined
    >(undefined);
    profileApi.fetchFollowSuggestions.mockResolvedValue([ana, ben]);
    profileApi.follow.mockResolvedValue(undefined);
    getLocationPermissionState.mockResolvedValue('unsupported');
    create();
  });

  it('asks nothing until a surface requests suggestions', async () => {
    await settle();

    expect(profileApi.fetchFollowSuggestions).not.toHaveBeenCalled();
    expect(service.suggestions()).toEqual([]);
  });

  it('loads them once requested', async () => {
    service.request();
    await settle();

    expect(service.suggestions()).toEqual([ana, ben]);
  });

  it('sends the position the feed already read', async () => {
    position$.next({ latitude: 46.9, longitude: 7.4 });
    service.request();
    await settle();

    expect(profileApi.fetchFollowSuggestions).toHaveBeenCalledWith({
      latitude: 46.9,
      longitude: 7.4,
    });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('never reads a position without an existing grant', async () => {
    getLocationPermissionState.mockResolvedValue('prompt');
    service.request();
    await settle();

    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(profileApi.fetchFollowSuggestions).toHaveBeenCalledWith(undefined);
  });

  it('shows nothing when the call fails', async () => {
    jest.spyOn(console, 'warn').mockImplementation();
    profileApi.fetchFollowSuggestions.mockRejectedValue(new Error('down'));
    service.request();
    await settle();

    expect(service.suggestions()).toEqual([]);
  });

  describe('follow', () => {
    beforeEach(async () => {
      service.request();
      await settle();
    });

    it('drops the person from the list and counts the follow', async () => {
      await expect(service.follow(ben, 'onboarding')).resolves.toBe(true);

      expect(profileApi.follow).toHaveBeenCalledWith('ben');
      expect(service.suggestions()).toEqual([ana]);
      expect(service.followsAnyone()).toBe(true);
      expect(logEvent).toHaveBeenCalledWith('follow_suggestion_followed', {
        surface: 'onboarding',
        position: 2,
        reason: 'active',
      });
      expect(logEvent).toHaveBeenCalledWith('user_followed', {
        source: 'suggestion',
      });
    });

    it('keeps the person and says so when the write fails', async () => {
      profileApi.follow.mockRejectedValue(new Error('permission-denied'));

      await expect(service.follow(ana, 'home')).resolves.toBe(false);

      expect(service.suggestions()).toEqual([ana, ben]);
      expect(service.pendingIds().size).toBe(0);
      expect(service.followsAnyone()).toBe(false);
      expect(present).toHaveBeenCalledWith({
        messageKey: 'follow-suggestions-follow-failed',
        outcome: 'failure',
      });
      expect(logEvent).not.toHaveBeenCalled();
    });

    it('marks the person pending while the write runs', async () => {
      let finish: () => void = () => undefined;
      profileApi.follow.mockReturnValue(
        new Promise<void>((resolve) => (finish = resolve)),
      );

      const following = service.follow(ana, 'home');

      expect(service.pendingIds().has('ana')).toBe(true);
      await expect(service.follow(ana, 'home')).resolves.toBe(false);
      finish();
      await following;
      expect(service.pendingIds().has('ana')).toBe(false);
      expect(profileApi.follow).toHaveBeenCalledTimes(1);
    });
  });

  it('counts a shown list with its surface and size', () => {
    service.trackShown('following_empty', 3);

    expect(logEvent).toHaveBeenCalledWith('follow_suggestions_shown', {
      surface: 'following_empty',
      count: 3,
    });
  });

  describe('the home card', () => {
    it('is shown to somebody who follows nobody', async () => {
      service.request();
      await settle();

      expect(service.homeCardVisible()).toBe(true);
    });

    it('is not wanted before the profile has arrived', () => {
      profile$.next(undefined);

      expect(service.homeCardWanted()).toBe(false);
    });

    it('is not wanted by somebody who already follows people', () => {
      profile$.next({ followingCount: 2 });

      expect(service.homeCardWanted()).toBe(false);
    });

    it('goes after the first follow', async () => {
      service.request();
      await settle();

      await service.follow(ana, 'home');

      expect(service.homeCardVisible()).toBe(false);
    });

    it('stays away for a week once dismissed, and saves only that field', async () => {
      settingsApi.mergeSettings.mockResolvedValue(undefined);

      await service.dismissHomeCard();

      expect(service.homeCardWanted()).toBe(false);
      expect(settingsApi.mergeSettings).toHaveBeenCalledWith({
        followSuggestionsDismissedAt: expect.any(String),
      });
      expect(notifySavedSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'CHF',
          followSuggestionsDismissedAt: expect.any(String),
        }),
      );
    });

    it('stays dismissed for the session when the save fails', async () => {
      jest.spyOn(console, 'warn').mockImplementation();
      settingsApi.mergeSettings.mockRejectedValue(new Error('offline'));

      await service.dismissHomeCard();

      expect(service.homeCardWanted()).toBe(false);
    });

    it('comes back once the week is over', () => {
      settings$.next({
        followSuggestionsDismissedAt: new Date(
          Date.now() - FOLLOW_SUGGESTIONS_DISMISS_MS - 1000,
        ).toISOString(),
      });

      expect(service.homeCardWanted()).toBe(true);
    });

    it('honours a dismissal saved on another device', () => {
      settings$.next({
        followSuggestionsDismissedAt: new Date(Date.now() - 1000).toISOString(),
      });

      expect(service.homeCardWanted()).toBe(false);
    });
  });
});
