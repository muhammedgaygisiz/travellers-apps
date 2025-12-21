import { reducer } from '../reducer';
import { BiteActions } from '../actions';
import { Bite } from 'model';
import { fromAuth } from 'ta-firestore';

describe('Bite Reducer', () => {
  describe('fromAuth.logoutSucceeded', () => {
    it('should clear the state on logout', () => {
      const INITIAL_STATE = {
        ids: ['1', '2'],
        entities: {
          '1': { id: '1', name: 'Bite 1' } as Bite,
          '2': { id: '2', name: 'Bite 2' } as Bite,
        },
      };

      const NEW_STATE = { ids: [], entities: {} };

      const action = fromAuth.AuthActions.logoutSucceeded;

      expect(reducer(INITIAL_STATE, action)).toEqual(NEW_STATE);
    });
  });

  describe('loadedByGPSPositionFromAPI', () => {
    it('should add bites to bites slice', () => {
      const INITIAL_STATE = { ids: [], entities: {} };
      const NEW_STATE = { ids: ['1'], entities: { '1': { id: '1' } } };

      const loadedBitesFromApiAction = BiteActions.loadedByGPSPositionFromAPI({
        bites: [{ id: '1' }] as Bite[],
      });

      expect(reducer(INITIAL_STATE, loadedBitesFromApiAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('loadedByUserFromAPI', () => {
    it('should add bites to bites slice', () => {
      const INITIAL_STATE = { ids: [], entities: {} };
      const NEW_STATE = { ids: ['1'], entities: { '1': { id: '1' } } };

      const loadedBitesFromApiAction = BiteActions.loadedByUserFromAPI({
        bites: [{ id: '1' }] as Bite[],
      });

      expect(reducer(INITIAL_STATE, loadedBitesFromApiAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('loadedByBucketlistFromAPI', () => {
    it('should add bites to bites slice', () => {
      const INITIAL_STATE = { ids: [], entities: {} };
      const NEW_STATE = { ids: ['1'], entities: { '1': { id: '1' } } };

      const loadedBitesFromApiAction = BiteActions.loadedByBucketlistFromAPI({
        bites: [{ id: '1' }] as Bite[],
      });

      expect(reducer(INITIAL_STATE, loadedBitesFromApiAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('deletedBite', () => {
    it('should remove the bite from the state', () => {
      const INITIAL_STATE = {
        ids: ['1'],
        entities: { '1': { id: '1', name: 'Bite 1' } as Bite },
      };
      const NEW_STATE = { ids: [], entities: {} };

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
        ids: ['1'],
        entities: { '1': { id: '1', name: 'Bite prev' } as Bite },
      };
      const NEW_STATE = {
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
      const INITIAL_STATE = { ids: [], entities: {} };
      const NEW_STATE = {
        ids: [],
        entities: {},
        cachedBite: { id: '1', name: 'Bite 1' } as Bite,
      };

      const cacheBiteAction = BiteActions.cacheBite({
        bite: { id: '1', name: 'Bite 1' } as Bite,
      });

      expect(reducer(INITIAL_STATE, cacheBiteAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('saveNewBite', () => {
    it('should clear the cached bite in the state', () => {
      const INITIAL_STATE = {
        ids: [],
        entities: {},
        cachedBite: { id: '1', name: 'Bite 1' } as Bite,
      };
      const NEW_STATE = { ids: [], entities: {} };

      const saveNewBiteAction = BiteActions.saveNewBite({
        bite: { id: '1', name: 'Bite 1' } as Bite,
      });

      expect(reducer(INITIAL_STATE, saveNewBiteAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('loadedBiteCreator', () => {
    it('should set the biteCreator in the state', () => {
      const INITIAL_STATE = { ids: [], entities: {} };
      const NEW_STATE = {
        ids: [],
        entities: {},
        biteCreator: { id: 'creator1', name: 'Creator 1' },
      };

      const loadedBiteCreatorAction = BiteActions.loadedBiteCreator({
        biteCreator: { id: 'creator1', name: 'Creator 1' },
      });

      expect(reducer(INITIAL_STATE, loadedBiteCreatorAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('noPublicCreatorForBite', () => {
    it('should clear the biteCreator in the state', () => {
      const INITIAL_STATE = {
        ids: [],
        entities: {},
        biteCreator: { id: 'creator1', name: 'Creator 1' },
      };
      const NEW_STATE = { ids: [], entities: {} };

      const noPublicCreatorForBiteAction = BiteActions.noPublicCreatorForBite();

      expect(reducer(INITIAL_STATE, noPublicCreatorForBiteAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });
});
