import * as fromSelectors from '../selectors';
import type { Menu } from 'model';

describe('Menu Selectors', () => {
  const MENU_1 = { id: '1', name: 'Menu 1' } as unknown as Menu;
  const MENU_2 = { id: '2', name: 'Menu 2' } as unknown as Menu;

  describe('menu', () => {
    describe('given an id that exists', () => {
      it('should select the menu by id', () => {
        const result = fromSelectors.menu.projector('1', [MENU_1, MENU_2]);

        expect(result).toEqual(MENU_1);
      });
    });

    describe('given an id that does not exist', () => {
      it('should return undefined', () => {
        const result = fromSelectors.menu.projector('3', [MENU_1, MENU_2]);

        expect(result).toBeUndefined();
      });
    });
  });
});
