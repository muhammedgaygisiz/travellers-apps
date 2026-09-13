import { MenuApiService } from '../menu-api.service';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { FieldValue, FirebaseFirestore } from '@capacitor-firebase/firestore';
import { of } from 'rxjs';
import type { Menu } from 'model';
import * as getMenuByIdUtil from '../utils/get-menu-by-id';

jest.mock('../utils/get-menu-by-id');

/**
 * Named rather than automocked, because the automock leaves `FieldValue`
 * undefined: it is a class export alongside the plugin object, and
 * `saveMenuCurrency` calls `FieldValue.delete()` to remove a field. The marker
 * returned here is the real one the plugin builds - a plain `{ __type__ }`
 * object, which is what lets it cross the native bridge.
 */
jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    getDocument: jest.fn(),
    updateDocument: jest.fn(),
  },
  FieldValue: { delete: jest.fn(() => ({ __type__: 'delete' })) },
}));

const MockedAuthService = {
  authState: (): any => ({
    user: { uid: '123' },
  }),
  isLoggedIn$: of(true),
};

describe(MenuApiService.name, () => {
  let service: MenuApiService;
  const mockDate = new Date('2024-03-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: MockedAuthService }],
    });

    service = TestBed.inject(MenuApiService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('loadMenu', () => {
    describe('given logged in true', () => {
      describe('and no menuId', () => {
        it('should return EMPTY', async () => {
          const result = await service.loadMenu('');

          expect(result).toBeUndefined();
        });
      });

      describe('given a menuId', () => {
        describe('and a successful call of getMenuById', () => {
          it('should call getMenuById', async () => {
            jest
              .spyOn(getMenuByIdUtil, 'getMenuById')
              .mockResolvedValue({ id: 'menuId', categories: [] });

            const result = await service.loadMenu('menuId');

            expect(result).toEqual({ id: 'menuId', categories: [] });
          });
        });

        describe('and a failing call to getMenuById', () => {
          beforeEach(() => {
            const error = new Error('Test error');
            jest
              .spyOn(getMenuByIdUtil, 'getMenuById')
              .mockImplementation(() => {
                throw error;
              });
          });

          it('should return EMPTY', async () => {
            try {
              await service.loadMenu('menuId');
            } catch {
              // do nothing
            }

            expect(true).toBe(true);
          });
        });
      });
    });
  });

  describe('handleError', () => {
    it('should log error to console and return EMPTY', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        service.handleError(new Error('Test error'));
      } catch {
        // do nothing
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching menu:',
        expect.any(Error),
      );
    });
  });

  describe('saveMenu', () => {
    it('should call FirebaseFirestore.updateDocument', async () => {
      const updateDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'updateDocument')
        .mockResolvedValue({} as any);

      const menuData = {
        id: 'menuId',
        name: 'Updated Menu',
      } as unknown as Menu;

      await service.saveMenu(menuData, 'restaurantId');

      expect(updateDocumentSpy).toHaveBeenCalledWith({
        data: {
          restaurantId: 'restaurantId',
          categories: undefined,
          updatedAt: '2024-03-15T12:00:00.000Z',
          updatedAtTimestamp: 1710504000000,
        },
        reference: 'menus/menuId',
      });
    });

    /**
     * The restaurant is what the ownership-scoped rules read the write's
     * authority from (issue #1078), so a save without one cannot succeed. It is
     * refused here rather than at Firestore, where it would come back as a
     * permission error the user cannot act on.
     */
    it('refuses a save that names no restaurant', async () => {
      const updateDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'updateDocument')
        .mockResolvedValue(undefined);
      updateDocumentSpy.mockClear();

      const menuData = { id: 'menuId' } as unknown as Menu;

      await expect(service.saveMenu(menuData, undefined)).rejects.toThrow(
        'Cannot save a menu without the restaurant it belongs to',
      );
      expect(updateDocumentSpy).not.toHaveBeenCalled();
    });
  });

  /**
   * The currency a menu states (GitHub issue #1102).
   *
   * Asserted on what reaches Firestore rather than on what the editor emits.
   * The control shipped wired to a save that never carried the field, so an
   * owner chose a currency, was told nothing was wrong, and the document kept
   * the old one - a component-level test of the emission passed throughout.
   */
  describe('saveMenuCurrency', () => {
    it('writes the chosen currency to the menu document', async () => {
      const updateDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'updateDocument')
        .mockResolvedValue(undefined);

      await service.saveMenuCurrency('menuId', 'restaurantId', 'JPY');

      expect(updateDocumentSpy).toHaveBeenCalledWith({
        reference: 'menus/menuId',
        data: {
          restaurantId: 'restaurantId',
          currency: 'JPY',
          updatedAt: '2024-03-15T12:00:00.000Z',
          updatedAtTimestamp: 1710504000000,
        },
      });
    });

    /**
     * "Not set" has to remove the field. `updateDocument` merges, so omitting
     * the key leaves whatever was there and the owner's unset is a silent
     * no-op; an empty string would be a second way of saying "not stated" that
     * every reader would then have to know about.
     */
    it('removes the field when the owner unsets the currency', async () => {
      const deletion = { __type__: 'delete' };
      (FieldValue.delete as jest.Mock).mockReturnValue(deletion);
      const updateDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'updateDocument')
        .mockResolvedValue(undefined);

      await service.saveMenuCurrency('menuId', 'restaurantId', '');

      expect(FieldValue.delete).toHaveBeenCalled();
      expect(updateDocumentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currency: deletion }),
        }),
      );
    });

    /** The ownership rules read the write's authority from it (issue #1078). */
    it('refuses a save that names no restaurant', async () => {
      const updateDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'updateDocument')
        .mockResolvedValue(undefined);
      updateDocumentSpy.mockClear();

      await expect(
        service.saveMenuCurrency('menuId', undefined, 'JPY'),
      ).rejects.toThrow(
        'Cannot save a menu without the restaurant it belongs to',
      );
      expect(updateDocumentSpy).not.toHaveBeenCalled();
    });
  });
});
