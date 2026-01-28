import * as fromSelectors from '../selectors';
import { PublicUser } from 'model';
import { UsersState } from '../adapter';

describe('Users Selectors', () => {
  describe('userByUrlParam', () => {
    describe('given userId', () => {
      const userIdParam = 'user-123';

      describe('and users', () => {
        const USER_1 = { userId: 'user-123', name: 'Alice' };
        const USER_2 = { userId: 'user-456', name: 'Bob' };
        const users = [USER_1, USER_2] as unknown as PublicUser[];

        it('should return user matching userId param', () => {
          const result = fromSelectors.userByUrlParam.projector(
            userIdParam,
            users,
          );
          expect(result).toEqual(USER_1);
        });
      });

      describe('and no users', () => {
        const users = [] as unknown as PublicUser[];

        it('should return undefined', () => {
          const result = fromSelectors.userByUrlParam.projector(
            userIdParam,
            users,
          );
          expect(result).toBeUndefined();
        });
      });
    });

    describe('given no userId', () => {
      it('should return undefined', () => {
        const result = fromSelectors.userByUrlParam.projector(undefined, []);
        expect(result).toBeUndefined();
      });
    });
  });

  describe('userByUserIdInBite', () => {
    describe('given a creator id', () => {
      const creatorId = 'user-123';

      describe('and users', () => {
        const USER_1 = { userId: 'user-123', name: 'Alice' };
        const USER_2 = { userId: 'user-456', name: 'Bob' };
        const users = [USER_1, USER_2] as unknown as PublicUser[];

        it('should return user matching creator id', () => {
          const result = fromSelectors.userByUserIdInBite.projector(
            creatorId,
            users,
          );
          expect(result).toEqual(USER_1);
        });
      });

      describe('and no users', () => {
        const users = [] as unknown as PublicUser[];

        it('should return undefined', () => {
          const result = fromSelectors.userByUserIdInBite.projector(
            creatorId,
            users,
          );
          expect(result).toBeUndefined();
        });
      });
    });
  });

  describe('users', () => {
    const USER_1 = { userId: 'user-123', name: 'Alice' };
    const USER_2 = { userId: 'user-456', name: 'Bob' };
    const FOLLOWERS = [USER_1] as unknown as PublicUser[];
    const FOLLOWINGS = [USER_2] as unknown as PublicUser[];

    const state = {
      followers: FOLLOWERS,
      followings: FOLLOWINGS,
    } as unknown as UsersState;

    describe('given followType "followers"', () => {
      const followType = 'followers';

      describe('and followers exist', () => {
        it('should return followers', () => {
          const result = fromSelectors.users.projector(state, followType);
          expect(result).toEqual(FOLLOWERS);
        });
      });

      describe('and slice is undefined', () => {
        const state = undefined as unknown as UsersState;

        it('should return empty array', () => {
          const result = fromSelectors.users.projector(state, followType);
          expect(result).toEqual([]);
        });
      });
    });

    describe('given followType "following"', () => {
      const followType = 'following';

      describe('and followings exist', () => {
        it('should return followings', () => {
          const result = fromSelectors.users.projector(state, followType);
          expect(result).toEqual(FOLLOWINGS);
        });
      });

      describe('and slice is undefined', () => {
        const state = undefined as unknown as UsersState;

        it('should return empty array', () => {
          const result = fromSelectors.users.projector(state, followType);
          expect(result).toEqual([]);
        });
      });
    });

    describe('given unknown followType', () => {
      const followType = 'unknown';

      it('should return empty array', () => {
        const result = fromSelectors.users.projector(state, followType);
        expect(result).toEqual([]);
      });
    });
  });
});
