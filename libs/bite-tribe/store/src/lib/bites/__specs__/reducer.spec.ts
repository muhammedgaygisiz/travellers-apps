import { reducer } from '../reducer';
import { loadedBitesFromApi, reloadBites } from '../actions';
import { Bite } from 'model';

describe('Bite Reducer', () => {
  describe('reloadBites', () => {
    it('should reset the state to initial values', () => {
      const INITIAL_STATE = { ids: [], entities: {}, reloading: false };

      const NEW_STATE = { ids: [], entities: {}, reloading: true };

      const reloadBitesAction = reloadBites();

      expect(reducer(INITIAL_STATE, reloadBitesAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });

  describe('loadedBitesFromApi', () => {
    it('should set loading:home to true', () => {
      const INITIAL_STATE = { ids: [], entities: {}, reloading: true };
      const NEW_STATE = { ids: [], entities: {}, reloading: false };

      const loadedBitesFromApiAction = loadedBitesFromApi({
        bites: [] as Bite[],
      });

      expect(reducer(INITIAL_STATE, loadedBitesFromApiAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });
});
