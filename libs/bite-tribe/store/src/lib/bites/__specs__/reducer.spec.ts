import { describe, expect, it } from 'vitest';
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

  describe('loadedBitesFromApi', () => {
    it('should set loading:home to true', () => {
      const INITIAL_STATE = { ids: [], entities: {} };
      const NEW_STATE = { ids: [], entities: {} };

      const loadedBitesFromApiAction = BiteActions.loadedFromAPI({
        bites: [] as Bite[],
      });

      expect(reducer(INITIAL_STATE, loadedBitesFromApiAction)).toEqual({
        ...NEW_STATE,
      });
    });

    it('should not include deleted bite in result', () => {
      const CURRENT_STATE = {
        ids: ['3'],
        entities: { '3': { id: '3', name: 'Bite 2' } as Bite },
      };

      const loadedBitesFromApiAction = BiteActions.loadedFromAPI({
        bites: [
          { id: '1', name: 'Bite 1' } as Bite,
          { id: '2', name: 'Bite 2' } as Bite,
        ],
      });

      const result = reducer(CURRENT_STATE, loadedBitesFromApiAction);
      expect(result).toEqual({
        ids: ['1', '2'],
        entities: {
          '1': { id: '1', name: 'Bite 1' } as Bite,
          '2': { id: '2', name: 'Bite 2' } as Bite,
        },
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
