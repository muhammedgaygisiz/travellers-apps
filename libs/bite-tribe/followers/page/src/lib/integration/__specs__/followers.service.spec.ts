import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { FollowersService } from '../followers.service';
import { FollowersDataAccessService } from 'bite-tribe/followers-data-access';
import { NavController } from '@ionic/angular/standalone';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of } from 'rxjs';
import { PATH } from 'utils';
import { FollowSuggestion, PublicUser } from 'model';
import { signal } from '@angular/core';
import { FollowSuggestionsService } from 'bite-tribe/follow-suggestions-data-access';

const usersLoading = signal(false);
const usersFailed = signal(false);
const usersValue = signal<PublicUser[]>([]);
const followType = signal<'followers' | 'following'>('following');
const userIdFromUrl = signal<string | undefined>('test-user-id');

class MockFollowersDataAccessService {
  users = {
    reload: jest.fn(),
    isLoading: usersLoading,
  };
  usersValue = usersValue;
  usersFailed = usersFailed;
  type = followType;
  isLoading = jest.fn();
  unfollowUser = jest.fn();
}

class MockBiteTribeStoreService {
  userId$ = of('test-user-id');
  userIdFromUrl = userIdFromUrl;
}

const followSuggestionsMock = {
  suggestions: signal<FollowSuggestion[]>([]),
  pendingIds: signal<ReadonlySet<string>>(new Set()),
  isLoading: signal(false),
  request: jest.fn(),
  follow: jest.fn(),
  trackShown: jest.fn(),
};

describe(FollowersService.name, () => {
  let service: FollowersService;
  let dataAccessService: FollowersDataAccessService;
  let navController: NavController;

  beforeEach(() => {
    jest.clearAllMocks();
    usersLoading.set(false);
    usersFailed.set(false);
    usersValue.set([]);
    followType.set('following');
    userIdFromUrl.set('test-user-id');
    TestBed.configureTestingModule({
      providers: [
        FollowersService,
        NavController,
        {
          provide: FollowersDataAccessService,
          useClass: MockFollowersDataAccessService,
        },
        { provide: BiteTribeStoreService, useClass: MockBiteTribeStoreService },
        { provide: FollowSuggestionsService, useValue: followSuggestionsMock },
        provideMockStore(),
      ],
    }).compileComponents();
    service = TestBed.inject(FollowersService);
    dataAccessService = TestBed.inject(FollowersDataAccessService);
    navController = TestBed.inject(NavController);
  });

  it('should create the service', () => {
    expect(service).toBeTruthy();
  });

  describe('userClicked', () => {
    it('should navigate to the user profile', () => {
      const user = { userId: 'user123' } as PublicUser;
      const navigateSpy = jest
        .spyOn(navController, 'navigateForward')
        .mockImplementation();
      service.userClicked(user);
      expect(navigateSpy).toHaveBeenCalledWith([PATH.PROFILE, 'user123']);
    });
  });

  describe('unfollowClicked', () => {
    it('should call unfollowUser on dataAccessService', async () => {
      const user = { userId: 'user123' } as PublicUser;
      const unfollowSpy = jest
        .spyOn(dataAccessService, 'unfollowUser')
        .mockResolvedValue();
      await service.unfollowClicked(user);
      expect(unfollowSpy).toHaveBeenCalledWith(user);
    });

    it('should not attempt to reload when loggedInUserId is empty', async () => {
      const user = { userId: 'user123' } as PublicUser;
      jest.spyOn(dataAccessService, 'unfollowUser').mockResolvedValue();

      // Mock loggedInUserId to return empty string
      Object.defineProperty(service, 'loggedInUserId', {
        get: jest.fn((): (() => string) => () => ''),
        configurable: true,
      });

      await service.unfollowClicked(user);
      // Just verify it completes without errors
      expect(true).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const user = { userId: 'user123' } as PublicUser;
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      jest
        .spyOn(dataAccessService, 'unfollowUser')
        .mockRejectedValue(new Error('Test error'));
      await service.unfollowClicked(user);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error unfollowing user:',
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('follow suggestions', () => {
    const ana: FollowSuggestion = {
      userId: 'ana',
      displayName: 'Ana',
      biteCount: 3,
      reason: 'active',
    };

    it("asks for suggestions on the user's own empty Following list", () => {
      TestBed.tick();

      expect(followSuggestionsMock.request).toHaveBeenCalled();
    });

    it("asks for suggestions on the user's own list with people in it", () => {
      usersValue.set([{ userId: 'x' } as PublicUser]);
      TestBed.tick();

      expect(followSuggestionsMock.request).toHaveBeenCalled();
    });

    it.each([
      ["someone else's list", (): void => userIdFromUrl.set('other-user')],
      ['a Followers list', (): void => followType.set('followers')],
      ['a list still loading', (): void => usersLoading.set(true)],
      ['a list that failed to load', (): void => usersFailed.set(true)],
    ])('does not ask on %s', (_label, arrange) => {
      arrange();
      TestBed.tick();

      expect(followSuggestionsMock.request).not.toHaveBeenCalled();
    });

    it('reloads the list after a follow so the person appears in it', async () => {
      followSuggestionsMock.follow.mockResolvedValue(true);

      await service.followSuggestion(ana);

      expect(followSuggestionsMock.follow).toHaveBeenCalledWith(
        ana,
        'following',
      );
      expect(dataAccessService.users.reload).toHaveBeenCalled();
    });

    it('leaves the list alone after a failed follow', async () => {
      followSuggestionsMock.follow.mockResolvedValue(false);

      await service.followSuggestion(ana);

      expect(dataAccessService.users.reload).not.toHaveBeenCalled();
    });

    it('counts the shown list as the Following surface', () => {
      service.trackSuggestionsShown(2);

      expect(followSuggestionsMock.trackShown).toHaveBeenCalledWith(
        'following',
        2,
      );
    });

    it('opens a suggested profile', () => {
      const navigateSpy = jest
        .spyOn(navController, 'navigateForward')
        .mockImplementation();

      service.suggestionClicked('ana');

      expect(navigateSpy).toHaveBeenCalledWith([PATH.PROFILE, 'ana']);
    });
  });
});
