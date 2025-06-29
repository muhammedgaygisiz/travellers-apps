import { errorLoadingGpsPosition } from '../actions';
import { reducer } from '../reducer';
import { AppSlice } from '../app-slice.model';

describe('App Reducer', () => {
  describe('errorLoadingGpsPosition', () => {
    it('should set position to undefined', () => {
      const INITIAL_STATE = {
        position: { latitude: 1, longitude: 2 },
      } as AppSlice;
      const NEW_STATE = {
        position: undefined,
      } as AppSlice;

      const errorLoadingGpsPositionAction = errorLoadingGpsPosition({
        error: 'error',
      });

      expect(reducer(INITIAL_STATE, errorLoadingGpsPositionAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });
});
