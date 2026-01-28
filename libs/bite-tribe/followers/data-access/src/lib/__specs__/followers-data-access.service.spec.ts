import { inject, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { FollowersDataAccessService } from '../followers-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ProfileApiService } from 'bite-tribe/api';
import { of } from 'rxjs';
import { PublicUser } from 'model';

class MockBiteTribeStoreService {
  users$ = of([]);
  type$ = of('followers');
  isFollowersLoading$ = of(false);
}

class MockProfileApiService {
  fetchFollowersWithDetails = jest.fn();
  fetchFollowingWithDetails = jest.fn();
  unfollowUser = jest.fn();
}

describe('FollowersDataAccessService', () => {
  let profileApiService: ProfileApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FollowersDataAccessService,
        { provide: BiteTribeStoreService, useClass: MockBiteTribeStoreService },
        { provide: ProfileApiService, useClass: MockProfileApiService },
        provideMockStore(),
      ],
    }).compileComponents();

    profileApiService = TestBed.inject(ProfileApiService);
  });

  it('should create the service', inject(
    [FollowersDataAccessService],
    (service: FollowersDataAccessService) => {
      expect(service).toBeTruthy();
    },
  ));

  describe('fetchFollowersWithDetails', () => {
    it('should call fetchFollowersWithDetails on ProfileApiService', inject(
      [FollowersDataAccessService],
      async (service: FollowersDataAccessService) => {
        const mockUsers: PublicUser[] = [
          { userId: 'user1', displayName: 'User 1' } as PublicUser,
        ];
        const fetchSpy = jest
          .spyOn(profileApiService, 'fetchFollowersWithDetails')
          .mockResolvedValue(mockUsers);

        const result = await service.fetchFollowersWithDetails('test-user-id');

        expect(fetchSpy).toHaveBeenCalledWith('test-user-id');
        expect(result).toEqual(mockUsers);
      },
    ));
  });

  describe('fetchFollowingWithDetails', () => {
    it('should call fetchFollowingWithDetails on ProfileApiService', inject(
      [FollowersDataAccessService],
      async (service: FollowersDataAccessService) => {
        const mockUsers: PublicUser[] = [
          { userId: 'user1', displayName: 'User 1' } as PublicUser,
        ];
        const fetchSpy = jest
          .spyOn(profileApiService, 'fetchFollowingWithDetails')
          .mockResolvedValue(mockUsers);

        const result = await service.fetchFollowingWithDetails('test-user-id');

        expect(fetchSpy).toHaveBeenCalledWith('test-user-id');
        expect(result).toEqual(mockUsers);
      },
    ));
  });

  describe('unfollowUser', () => {
    it('should call unfollowUser on ProfileApiService', inject(
      [FollowersDataAccessService],
      async (service: FollowersDataAccessService) => {
        const mockUser = {
          userId: 'user1',
          displayName: 'User 1',
        } as PublicUser;
        const unfollowSpy = jest
          .spyOn(profileApiService, 'unfollowUser')
          .mockResolvedValue();

        await service.unfollowUser(mockUser);

        expect(unfollowSpy).toHaveBeenCalledWith(mockUser);
      },
    ));
  });
});
