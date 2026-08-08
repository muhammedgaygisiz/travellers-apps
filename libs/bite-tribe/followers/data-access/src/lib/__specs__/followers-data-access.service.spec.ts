import { inject, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { FollowersDataAccessService } from '../followers-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ProfileApiService } from 'bite-tribe/api';
import { of } from 'rxjs';
import { PublicUser } from 'model';
import { signal } from '@angular/core';

type UsersLoaderArg = Parameters<FollowersDataAccessService['usersLoader']>[0];

class MockBiteTribeStoreService {
  type$ = of('followers');
  userIdFromUrl = signal<string | null>(null);
  type = signal<string | null>(null);
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
          } as unknown as UsersLoaderArg);

          expect(result).resolves.toEqual([]);
        },
      ));

      it('should return empty array for following', inject(
        [FollowersDataAccessService],
        (service: FollowersDataAccessService) => {
          const result = service.usersLoader({
            params: { type: 'following' },
          } as unknown as UsersLoaderArg);

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
          } as unknown as UsersLoaderArg);

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
            } as unknown as UsersLoaderArg);

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
            } as unknown as UsersLoaderArg);

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
            } as unknown as UsersLoaderArg);

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
            } as unknown as UsersLoaderArg);

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
            } as unknown as UsersLoaderArg);

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
            } as unknown as UsersLoaderArg);

            expect(fetchFollowingWithDetailsSpy).not.toHaveBeenCalled();
          },
        ));
      });
    });
  });

  describe('given the list read fails', () => {
    const settle = async (): Promise<void> => {
      TestBed.flushEffects();

      for (let tick = 0; tick < 20; tick++) {
        await Promise.resolve();
      }

      TestBed.flushEffects();
    };

    // Reading `users.value()` on a failed resource throws, which used to abort
    // the list page's binding update instead of reporting the failure.
    // See GitHub issue #1232.
    it('should answer with no users and report the failure', inject(
      [FollowersDataAccessService, BiteTribeStoreService],
      async (
        service: FollowersDataAccessService,
        store: MockBiteTribeStoreService,
      ) => {
        jest
          .spyOn(profileApiService, 'fetchFollowersWithDetails')
          .mockRejectedValue(new Error('permission-denied'));
        store.userIdFromUrl.set('user1');
        store.type.set('followers');

        await settle();

        expect(() => service.users.value()).toThrow();
        expect(service.usersValue()).toEqual([]);
        expect(service.usersFailed()).toBe(true);
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
