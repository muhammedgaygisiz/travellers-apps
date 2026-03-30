import { reducer } from '../reducer';
import { BiteActions } from '../actions';
import type { Bite } from 'model';
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
    it('should remove the bite from the entity state', () => {
      const INITIAL_STATE = {
        ...EMPTY_STATE,
        ids: ['1'],
        entities: { '1': { id: '1', name: 'Bite 1' } as Bite },
      };

      const deletedBiteAction = BiteActions.deletedBite({
        bite: { id: '1', name: 'Bite 1' } as Bite,
      });

      expect(reducer(INITIAL_STATE, deletedBiteAction)).toEqual({
        ...EMPTY_STATE,
      });
    });

    it('should remove the bite from bitesByUserId', () => {
      const INITIAL_STATE = {
        ...EMPTY_STATE,
        bitesByUserId: [
          { id: '1', name: 'Bite 1' } as Bite,
          { id: '2', name: 'Bite 2' } as Bite,
        ],
      };

      const deletedBiteAction = BiteActions.deletedBite({
        bite: { id: '1', name: 'Bite 1' } as Bite,
      });

      expect(reducer(INITIAL_STATE, deletedBiteAction).bitesByUserId).toEqual([
        { id: '2', name: 'Bite 2' },
      ]);
    });

    it('should remove the bite from latestBites', () => {
      const INITIAL_STATE = {
        ...EMPTY_STATE,
        latestBites: [
          { id: '1', name: 'Bite 1' } as Bite,
          { id: '2', name: 'Bite 2' } as Bite,
        ],
      };

      const deletedBiteAction = BiteActions.deletedBite({
        bite: { id: '1', name: 'Bite 1' } as Bite,
      });

      expect(reducer(INITIAL_STATE, deletedBiteAction).latestBites).toEqual([
        { id: '2', name: 'Bite 2' },
      ]);
    });

    it('should remove the bite from bitesByBucketlist', () => {
      const INITIAL_STATE = {
        ...EMPTY_STATE,
        bitesByBucketlist: [
          { id: '1', name: 'Bite 1' } as Bite,
          { id: '2', name: 'Bite 2' } as Bite,
        ],
      };

      const deletedBiteAction = BiteActions.deletedBite({
        bite: { id: '1', name: 'Bite 1' } as Bite,
      });

      expect(reducer(INITIAL_STATE, deletedBiteAction).bitesByBucketlist).toEqual([
        { id: '2', name: 'Bite 2' },
      ]);
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

  describe('saveNewBite', () => {
    it('should clear the cached bite in the state', () => {
      const INITIAL_STATE = {
        ...EMPTY_STATE,
        cachedBite: { id: '1', name: 'Bite 1' } as Bite,
      };

      const saveNewBiteAction = BiteActions.saveNewBite({
        bite: { id: '1', name: 'Bite 1' } as Bite,
      });

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

      const payload = { payload: { event: { url: PATH.HOME } } } as any;

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
        payload: { event: { url: PATH.BITE } } as any,
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
});
