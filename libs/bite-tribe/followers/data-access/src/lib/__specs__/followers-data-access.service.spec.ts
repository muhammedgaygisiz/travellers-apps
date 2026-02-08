import { inject, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { FollowersDataAccessService } from '../followers-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ProfileApiService } from 'bite-tribe/api';
import { of } from 'rxjs';
import { PublicUser } from 'model';
import { signal } from '@angular/core';

class MockBiteTribeStoreService {
  type$ = of('followers');
  userIdFromUrl = signal(null);
  type = signal(null);
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

  describe('usersLoader', () => {
    describe('given no user id', () => {
      it('should return empty array for followers', inject(
        [FollowersDataAccessService],
        (service: FollowersDataAccessService) => {
          const result = service.usersLoader({
            params: { type: 'followers' },
          } as any);

          expect(result).resolves.toEqual([]);
        },
      ));

      it('should return empty array for following', inject(
        [FollowersDataAccessService],
        (service: FollowersDataAccessService) => {
          const result = service.usersLoader({
            params: { type: 'following' },
          } as any);

          expect(result).resolves.toEqual([]);
        },
      ));
    });

    describe('given user id but different type', () => {
      it('should return empty array', inject(
        [FollowersDataAccessService],
        (service: FollowersDataAccessService) => {
          const result = service.usersLoader({
            params: { type: 'unknown', userId: 'some-user-id' },
          } as any);

          expect(result).resolves.toEqual([]);
        },
      ));
    });

    describe('given a user id', () => {
      describe('and type followers', () => {
        it('should call fetchFollowersWithDetails', inject(
          [FollowersDataAccessService],
          (service: FollowersDataAccessService) => {
            const userId = 'some-user-id';
            service.usersLoader({
              params: { type: 'followers', userId },
            } as any);

            expect(
              profileApiService.fetchFollowersWithDetails,
            ).toHaveBeenCalledWith(userId);
          },
        ));
      });

      describe('and type following', () => {
        it('should call fetchFollowingWithDetails', inject(
          [FollowersDataAccessService],
          (service: FollowersDataAccessService) => {
            const userId = 'some-user-id';
            service.usersLoader({
              params: { type: 'following', userId },
            } as any);

            expect(
              profileApiService.fetchFollowingWithDetails,
            ).toHaveBeenCalledWith(userId);
          },
        ));
      });
    });
  });

  describe('users', () => {
    const userId = 'some-user-id';
    let fetchFollowersWithDetailsSpy: jest.SpyInstance;
    let fetchFollowingWithDetailsSpy: jest.SpyInstance;

    beforeEach(() => {
      fetchFollowersWithDetailsSpy = jest.spyOn(
        profileApiService,
        'fetchFollowersWithDetails',
      );
      fetchFollowingWithDetailsSpy = jest.spyOn(
        profileApiService,
        'fetchFollowingWithDetails',
      );
    });

    describe('given followers type', () => {
      describe('with user id', () => {
        it('should fetch followers', inject(
          [FollowersDataAccessService, BiteTribeStoreService],
          (service: FollowersDataAccessService) => {
            service.usersLoader({
              params: { type: 'followers', userId },
            } as any);

            expect(fetchFollowersWithDetailsSpy).toHaveBeenCalledWith(userId);
          },
        ));
      });

      describe('without user id', () => {
        it('should not call api', inject(
          [FollowersDataAccessService],
          (service: FollowersDataAccessService) => {
            service.usersLoader({
              params: { type: 'followers' },
            } as any);

            expect(fetchFollowersWithDetailsSpy).not.toHaveBeenCalled();
          },
        ));
      });
    });

    describe('given following type', () => {
      describe('with user id', () => {
        it('should fetch followings', inject(
          [FollowersDataAccessService],
          (service: FollowersDataAccessService) => {
            service.usersLoader({
              params: { type: 'following', userId },
            } as any);

            expect(fetchFollowingWithDetailsSpy).toHaveBeenCalledWith(userId);
          },
        ));
      });

      describe('without user id', () => {
        it('should not call api', inject(
          [FollowersDataAccessService],
          (service: FollowersDataAccessService) => {
            service.usersLoader({
              params: { type: 'following' },
            } as any);

            expect(fetchFollowingWithDetailsSpy).not.toHaveBeenCalled();
          },
        ));
      });
    });
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
