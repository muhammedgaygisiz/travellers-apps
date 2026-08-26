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

  describe('isMenuLoading', () => {
    describe('given a menu that has neither arrived nor failed', () => {
      it('should report the read as still running', () => {
        const result = fromSelectors.isMenuLoading.projector(
          '1',
          undefined,
          undefined,
        );

        expect(result).toBe(true);
      });
    });

    describe('given a menu that has arrived', () => {
      it('should report the read as done', () => {
        const result = fromSelectors.isMenuLoading.projector(
          '1',
          MENU_1,
          undefined,
        );

        expect(result).toBe(false);
      });
    });

    describe('given a failure for another menu', () => {
      it('should still report this read as running', () => {
        // A failure carried over from a menu left behind says nothing about the
        // one now on screen, which is why the id is recorded with it (#1382).
        const result = fromSelectors.isMenuLoading.projector(
          '1',
          undefined,
          '2',
        );

        expect(result).toBe(true);
      });
    });

    describe('given a route with no menu at all', () => {
      it('should report no read', () => {
        const result = fromSelectors.isMenuLoading.projector(
          undefined,
          undefined,
          undefined,
        );

        expect(result).toBe(false);
      });
    });
  });

  describe('isMenuUnavailable', () => {
    describe('given a failed read of the menu on screen', () => {
      it('should report the menu as unavailable', () => {
        const result = fromSelectors.isMenuUnavailable.projector(
          '1',
          undefined,
          '1',
        );

        expect(result).toBe(true);
      });
    });

    describe('given a failure for another menu', () => {
      it('should not report this menu as unavailable', () => {
        const result = fromSelectors.isMenuUnavailable.projector(
          '1',
          undefined,
          '2',
        );

        expect(result).toBe(false);
      });
    });

    describe('given a menu that arrived', () => {
      it('should not report it as unavailable', () => {
        const result = fromSelectors.isMenuUnavailable.projector(
          '1',
          MENU_1,
          '1',
        );

        expect(result).toBe(false);
      });
    });
  });
});
