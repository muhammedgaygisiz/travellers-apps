import { Like } from 'model';
import { EntityState } from '@ngrx/entity';
import { adapter, initialState } from '../adapter';
import { reducer } from '../reducer';
import {
  removeLike,
  removeLikeFailed,
  saveLike,
  saveLikeFailed,
} from '../actions';

const like: Like = {
  biteId: 'bite1',
  userId: 'user1',
  likeType: 'thumbup',
  createdAt: '2026-01-01T00:00:00Z',
};

const stateWith = (...likes: Like[]): EntityState<Like> =>
  adapter.upsertMany(likes, initialState);

describe('Likes Reducer', () => {
  describe('saveLike', () => {
    it('should optimistically add the like', () => {
      const state = reducer(initialState, saveLike({ like }));

      expect(state.entities['bite1-user1']).toEqual(like);
    });

    it('should overwrite an existing like when switching type', () => {
      const state = reducer(
        stateWith(like),
        saveLike({
          like: { ...like, likeType: 'drooling' },
          previousLikeType: 'thumbup',
        }),
      );

      expect(state.entities['bite1-user1']?.likeType).toBe('drooling');
    });
  });

  describe('saveLikeFailed', () => {
    it('should remove the optimistic like when there was no previous like', () => {
      const state = reducer(stateWith(like), saveLikeFailed({ like }));

      expect(state.entities['bite1-user1']).toBeUndefined();
    });

    it('should restore the previous like type', () => {
      const state = reducer(
        stateWith({ ...like, likeType: 'drooling' }),
        saveLikeFailed({
          like: { ...like, likeType: 'drooling' },
          previousLikeType: 'thumbup',
        }),
      );

      expect(state.entities['bite1-user1']?.likeType).toBe('thumbup');
    });
  });

  describe('removeLike', () => {
    it('should optimistically remove the like', () => {
      const state = reducer(stateWith(like), removeLike({ like }));

      expect(state.entities['bite1-user1']).toBeUndefined();
    });
  });

  describe('removeLikeFailed', () => {
    it('should restore the removed like', () => {
      const state = reducer(initialState, removeLikeFailed({ like }));

      expect(state.entities['bite1-user1']).toEqual(like);
    });
  });
});
