import { reducer } from '../reducer';
import { BiteActions } from '../actions';
import {
  removeLike,
  removeLikeFailed,
  saveLike,
  saveLikeFailed,
} from '../../likes/actions';
import type { Bite, Like } from 'model';
import { fromAuth } from 'ta-firestore';
import { routerNavigatedAction } from '@ngrx/router-store';
import { PATH } from 'utils';
import { BitesState } from '../adapter';

const EMPTY_STATE: BitesState = {
  ids: [],
  entities: {},
  latestBites: [],
  bitesByUserId: [],
  bitesByBucketlist: [],
};

describe('Bite Reducer', () => {
  describe('fromAuth.logoutSucceeded', () => {
    it('should clear the state on logout', () => {
      const INITIAL_STATE: BitesState = {
        ...EMPTY_STATE,
        ids: ['1', '2'],
        entities: {
          '1': { id: '1', name: 'Bite 1' } as Bite,
          '2': { id: '2', name: 'Bite 2' } as Bite,
        },
      };

      const action = fromAuth.AuthActions.logoutSucceeded;

      expect(reducer(INITIAL_STATE, action)).toEqual(EMPTY_STATE);
    });
  });

  describe('loadedByGPSPositionFromAPI', () => {
    it('should add bites to bites slice', () => {
      const NEW_STATE = {
        ...EMPTY_STATE,
        ids: ['1'],
        entities: { '1': { id: '1' } },
      };

      const loadedBitesFromApiAction = BiteActions.loadedByGPSPositionFromAPI({
        bites: [{ id: '1' }] as Bite[],
      });

      expect(reducer(EMPTY_STATE, loadedBitesFromApiAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('loadedByUserFromAPI', () => {
    it('should add bites to bitesByUserId slice', () => {
      const loadedBitesFromApiAction = BiteActions.loadedByUserFromAPI({
        bites: [{ id: '1' }] as Bite[],
      });

      expect(reducer(EMPTY_STATE, loadedBitesFromApiAction)).toEqual({
        ...EMPTY_STATE,
        bitesByUserId: [{ id: '1' }],
      });
    });
  });

  describe('loadedByBucketlistFromAPI', () => {
    it('should add bites to bites slice', () => {
      const NEW_STATE = {
        ...EMPTY_STATE,
        bitesByBucketlist: [{ id: '1' }],
      };

      const loadedBitesFromApiAction = BiteActions.loadedByBucketlistFromAPI({
        bites: [{ id: '1' }] as Bite[],
      });

      expect(reducer(EMPTY_STATE, loadedBitesFromApiAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('deletedBite', () => {
    it('should remove the bite from the state', () => {
      const INITIAL_STATE = {
        ...EMPTY_STATE,
        ids: ['1'],
        entities: { '1': { id: '1', name: 'Bite 1' } as Bite },
      };
      const NEW_STATE = {
        ...EMPTY_STATE,
      };

      const deletedBiteAction = BiteActions.deletedBite({
        bite: { id: '1', name: 'Bite 1' } as Bite,
      });

      expect(reducer(INITIAL_STATE, deletedBiteAction)).toEqual({
        ...NEW_STATE,
      });
    });

    it('should remove the bite from bitesByUserId', () => {
      const INITIAL_STATE = {
        ...EMPTY_STATE,
        bitesByUserId: [{ id: '1', name: 'Bite 1' } as Bite],
      };
      const NEW_STATE = {
        ...EMPTY_STATE,
        bitesByUserId: [],
      };

      const deletedBiteAction = BiteActions.deletedBite({
        bite: { id: '1', name: 'Bite 1' } as Bite,
      });

      expect(reducer(INITIAL_STATE, deletedBiteAction)).toEqual({
        ...NEW_STATE,
      });
    });

    it('should remove the bite from latest bites', () => {
      const INITIAL_STATE = {
        ...EMPTY_STATE,
        latestBites: [{ id: '1', name: 'Bite 1' } as Bite],
      };
      const NEW_STATE = {
        ...EMPTY_STATE,
        latestBites: [],
      };

      const deletedBiteAction = BiteActions.deletedBite({
        bite: { id: '1', name: 'Bite 1' } as Bite,
      });

      expect(reducer(INITIAL_STATE, deletedBiteAction)).toEqual({
        ...NEW_STATE,
      });
    });

    it('should remove bite from bitesByBucketlist', () => {
      const INITIAL_STATE = {
        ...EMPTY_STATE,
        bitesByBucketlist: [{ id: '1', name: 'Bite 1' } as Bite],
      };
      const NEW_STATE = {
        ...EMPTY_STATE,
        bitesByBucketlist: [],
      };

      const deletedBiteAction = BiteActions.deletedBite({
        bite: { id: '1', name: 'Bite 1' } as Bite,
      });

      expect(reducer(INITIAL_STATE, deletedBiteAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('savedBite', () => {
    it('should upsert the bite in the state', () => {
      const INITIAL_STATE = {
        ...EMPTY_STATE,
        ids: ['1'],
        entities: { '1': { id: '1', name: 'Bite prev' } as Bite },
      };
      const NEW_STATE = {
        ...EMPTY_STATE,
        ids: ['1'],
        entities: { '1': { id: '1', name: 'Bite new' } as Bite },
      };

      const savedBiteAction = BiteActions.savedBite({
        bite: { id: '1', name: 'Bite new' } as Bite,
      });

      expect(reducer(INITIAL_STATE, savedBiteAction)).toEqual({
        ...NEW_STATE,
      });
    });

    it('should reset editingBite', () => {
      const INITIAL_STATE = {
        ...EMPTY_STATE,
        ids: ['1'],
        entities: { '1': { id: '1', name: 'Bite prev' } as Bite },
        editingBite: { id: '1', name: 'Bite prev' } as Bite,
      };
      const NEW_STATE = {
        ...EMPTY_STATE,
        ids: ['1'],
        entities: { '1': { id: '1', name: 'Bite new' } as Bite },
      };

      const savedBiteAction = BiteActions.savedBite({
        bite: { id: '1', name: 'Bite new' } as Bite,
      });

      expect(reducer(INITIAL_STATE, savedBiteAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('createdBite', () => {
    it('should put the new bite in the state', () => {
      const NEW_STATE = {
        ...EMPTY_STATE,
        ids: ['1'],
        entities: { '1': { id: '1', name: 'Bite new' } as Bite },
      };

      const createdBiteAction = BiteActions.createdBite({
        bite: { id: '1', name: 'Bite new' } as Bite,
      });

      expect(reducer(EMPTY_STATE, createdBiteAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('cacheBite', () => {
    it('should cache the bite in the state', () => {
      const NEW_STATE = {
        ...EMPTY_STATE,
        cachedBite: { id: '1', name: 'Bite 1' } as Bite,
      };

      const cacheBiteAction = BiteActions.cacheBite({
        bite: { id: '1', name: 'Bite 1' } as Bite,
      });

      expect(reducer(EMPTY_STATE, cacheBiteAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('clearCachedBite', () => {
    const MENU_ITEM_DRAFT = {
      name: 'Amok Trey',
      place: 'Khmer Kitchen',
      restaurantId: 'restaurant-1',
    } as Partial<Bite>;

    it('should clear the cached bite in the state', () => {
      const INITIAL_STATE = {
        ...EMPTY_STATE,
        cachedBite: MENU_ITEM_DRAFT,
      };

      const clearCachedBiteAction = BiteActions.clearCachedBite();

      expect(reducer(INITIAL_STATE, clearCachedBiteAction)).toEqual({
        ...EMPTY_STATE,
      });
    });

    it('should leave a later generic bite creation without a prefilled draft', () => {
      const cancelledMenuFlow = reducer(
        reducer(EMPTY_STATE, BiteActions.cacheBite({ bite: MENU_ITEM_DRAFT })),
        BiteActions.clearCachedBite(),
      );

      expect(cancelledMenuFlow.cachedBite).toBeUndefined();
    });

    it('should let a later menu item prefill its own draft', () => {
      const otherMenuItemDraft = {
        name: 'Lok Lak',
        place: 'Khmer Kitchen',
        restaurantId: 'restaurant-1',
      } as Partial<Bite>;

      const cancelledMenuFlow = reducer(
        reducer(EMPTY_STATE, BiteActions.cacheBite({ bite: MENU_ITEM_DRAFT })),
        BiteActions.clearCachedBite(),
      );

      expect(
        reducer(
          cancelledMenuFlow,
          BiteActions.cacheBite({ bite: otherMenuItemDraft }),
        ).cachedBite,
      ).toEqual(otherMenuItemDraft);
    });
  });

  describe('saveNewBite', () => {
    it('should clear the cached bite in the state', () => {
      const INITIAL_STATE = {
        ...EMPTY_STATE,
        cachedBite: { id: '1', name: 'Bite 1' } as Bite,
      };

      const saveNewBiteAction = BiteActions.saveNewBite();

      expect(reducer(INITIAL_STATE, saveNewBiteAction)).toEqual({
        ...EMPTY_STATE,
      });
    });
  });

  describe('noPublicCreatorForBite', () => {
    it('should clear the biteCreator in the state', () => {
      const INITIAL_STATE = {
        ...EMPTY_STATE,
        biteCreator: { id: 'creator1', name: 'Creator 1' },
      };

      const noPublicCreatorForBiteAction = BiteActions.noPublicCreatorForBite();

      expect(reducer(INITIAL_STATE, noPublicCreatorForBiteAction)).toEqual({
        ...EMPTY_STATE,
      });
    });
  });

  describe('setEditingBite', () => {
    it('should set the editingBite in the state', () => {
      const NEW_STATE = {
        ...EMPTY_STATE,
        editingBite: { id: '1', name: 'Bite 1' } as Bite,
      };

      const setEditingBiteAction = BiteActions.setEditingBite({
        bite: { id: '1', name: 'Bite 1' } as Bite,
      });

      expect(reducer(EMPTY_STATE, setEditingBiteAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('routerNavigatedAction', () => {
    it('should clear biteCreator when navigating to HOME path', () => {
      const INITIAL_STATE = {
        ...EMPTY_STATE,
        biteCreator: { id: 'creator1', name: 'Creator 1' },
      };

      const payload = {
        payload: { event: { url: PATH.HOME } },
      } as unknown as Parameters<typeof routerNavigatedAction>[0];

      expect(reducer(INITIAL_STATE, routerNavigatedAction(payload))).toEqual({
        ...EMPTY_STATE,
      });
    });

    it('should not change state when navigating to other paths', () => {
      const INITIAL_STATE = {
        ...EMPTY_STATE,
        biteCreator: { id: 'creator1', name: 'Creator 1' },
      };

      const action = routerNavigatedAction({
        payload: { event: { url: PATH.BITE } } as unknown as Parameters<
          typeof routerNavigatedAction
        >[0]['payload'],
      });

      expect(reducer(INITIAL_STATE, action)).toEqual({
        ...INITIAL_STATE,
      });
    });
  });

  describe('loadedLatestFromAPI', () => {
    it('should update latestBites in the state', () => {
      const NEW_STATE = {
        ...EMPTY_STATE,
        latestBites: [{ id: '1' } as Bite, { id: '2' } as Bite],
      };

      const loadedLatestFromApiAction = BiteActions.loadedLatestFromAPI({
        bites: [{ id: '1' } as Bite, { id: '2' } as Bite],
      });

      expect(reducer(EMPTY_STATE, loadedLatestFromApiAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('optimistic like counts', () => {
    const like: Like = {
      biteId: '1',
      userId: 'user1',
      likeType: 'thumbup',
      createdAt: '2026-01-01T00:00:00Z',
    };

    const STATE_WITH_BITE: BitesState = {
      ...EMPTY_STATE,
      ids: ['1'],
      entities: { '1': { id: '1', name: 'Bite 1', thumbup: 2 } as Bite },
      latestBites: [{ id: '1', name: 'Bite 1', thumbup: 2 } as Bite],
    };

    it('should increment the count on saveLike', () => {
      const state = reducer(STATE_WITH_BITE, saveLike({ like }));

      expect(state.entities['1']?.thumbup).toBe(3);
      expect(state.latestBites[0].thumbup).toBe(3);
    });

    it('should move the count between types when switching the like', () => {
      const state = reducer(
        STATE_WITH_BITE,
        saveLike({
          like: { ...like, likeType: 'drooling' },
          previousLikeType: 'thumbup',
        }),
      );

      expect(state.entities['1']?.thumbup).toBe(1);
      expect(state.entities['1']?.drooling).toBe(1);
    });

    it('should revert the count on saveLikeFailed', () => {
      const afterSave = reducer(STATE_WITH_BITE, saveLike({ like }));
      const state = reducer(afterSave, saveLikeFailed({ like }));

      expect(state.entities['1']?.thumbup).toBe(2);
    });

    it('should decrement the count on removeLike', () => {
      const state = reducer(STATE_WITH_BITE, removeLike({ like }));

      expect(state.entities['1']?.thumbup).toBe(1);
    });

    it('should restore the count on removeLikeFailed', () => {
      const afterRemove = reducer(STATE_WITH_BITE, removeLike({ like }));
      const state = reducer(afterRemove, removeLikeFailed({ like }));

      expect(state.entities['1']?.thumbup).toBe(2);
    });
  });
});
