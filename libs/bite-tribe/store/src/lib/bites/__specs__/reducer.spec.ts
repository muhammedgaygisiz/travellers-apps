import { saveEditingBite } from '../actions';
import { reducer } from '../reducer';
import { Bite } from 'model';

describe('Bites Reducer', () => {
  describe('saveEditingBite', () => {
    it('should set editingBite', () => {
      const biteMock = {} as Bite;
      const INITIAL_STATE = { ids: [], entities: [], editingBite: undefined };
      const NEW_STATE = {
        ...INITIAL_STATE,
        editingBite: biteMock,
      };

      const saveEditingBiteAction = saveEditingBite({ bite: biteMock });

      expect(reducer(INITIAL_STATE, saveEditingBiteAction)).toEqual({
        ...NEW_STATE,
      });
    });
  });
});
