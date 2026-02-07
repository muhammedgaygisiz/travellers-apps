import * as fromSelectors from '../selectors';
import { PublicUser } from 'model';

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
});
