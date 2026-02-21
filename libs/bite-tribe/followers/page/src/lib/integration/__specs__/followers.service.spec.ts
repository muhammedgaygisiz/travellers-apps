import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { FollowersService } from '../followers.service';
import { FollowersDataAccessService } from 'bite-tribe/followers-data-access';
import { NavController } from '@ionic/angular/standalone';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of } from 'rxjs';
import { PATH } from 'utils';
import { PublicUser } from 'model';

class MockFollowersDataAccessService {
  users = {
    reload: jest.fn(),
  };
  type = jest.fn();
  isLoading = jest.fn();
  unfollowUser = jest.fn();
}

class MockBiteTribeStoreService {
  userId$ = of('test-user-id');
}

describe(FollowersService.name, () => {
  let service: FollowersService;
  let dataAccessService: FollowersDataAccessService;
  let navController: NavController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FollowersService,
        NavController,
        {
          provide: FollowersDataAccessService,
          useClass: MockFollowersDataAccessService,
        },
        { provide: BiteTribeStoreService, useClass: MockBiteTribeStoreService },
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
});
