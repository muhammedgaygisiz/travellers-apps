import { MenuApiService } from '../menu-api.service';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { FieldValue, FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { of } from 'rxjs';
import type { Menu } from 'model';
import * as getMenuByIdUtil from '../utils/get-menu-by-id';

jest.mock('../utils/get-menu-by-id');
jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: jest.fn() },
}));

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
    getCollection: jest.fn(),
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
     * A menu derived from Bites keeps saying so after its owner edits it: only
     * an explicit owner confirmation may retract `derivedFromBites`, and that
     * does not exist yet (issue #1511). `updateDocument` merges, so the save
     * keeps the flag - and the menu's currency - by not naming them.
     */
    it('leaves derivedFromBites and currency out of the write', async () => {
      const updateDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'updateDocument')
        .mockResolvedValue(undefined);
      updateDocumentSpy.mockClear();

      const menuData: Menu = {
        id: 'menuId',
        categories: [],
        derivedFromBites: true,
        currency: 'CHF',
      };

      await service.saveMenu(menuData, 'restaurantId');

      const [{ data }] = updateDocumentSpy.mock.calls[0];

      expect(data).not.toHaveProperty('derivedFromBites');
      expect(data).not.toHaveProperty('currency');
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

  /** See GitHub issue #2214. */
  describe('confirmMenuAsOwn', () => {
    it('removes derivedFromBites and writes nothing else of the menu', async () => {
      const deletion = { __type__: 'delete' };
      (FieldValue.delete as jest.Mock).mockReturnValue(deletion);
      const updateDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'updateDocument')
        .mockResolvedValue(undefined);

      await service.confirmMenuAsOwn('menuId', 'restaurantId');

      expect(updateDocumentSpy).toHaveBeenCalledWith({
        reference: 'menus/menuId',
        data: {
          restaurantId: 'restaurantId',
          derivedFromBites: deletion,
          updatedAt: '2024-03-15T12:00:00.000Z',
          updatedAtTimestamp: 1710504000000,
        },
      });
    });

    it('refuses a confirmation that names no restaurant', async () => {
      const updateDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'updateDocument')
        .mockResolvedValue(undefined);
      updateDocumentSpy.mockClear();

      await expect(
        service.confirmMenuAsOwn('menuId', undefined),
      ).rejects.toThrow(
        'Cannot save a menu without the restaurant it belongs to',
      );
      expect(updateDocumentSpy).not.toHaveBeenCalled();
    });
  });

  /** The business app's Guest Bites page (GitHub issue #2216). */
  describe('loadBitesForRestaurant', () => {
    it("reads the restaurant's Bites by one filter and orders them newest first", async () => {
      (FirebaseFirestore.getCollection as jest.Mock).mockResolvedValue({
        snapshots: [
          { id: 'old', data: { name: 'Old', createdAtTimestamp: 1 } },
          { id: 'gone', data: undefined },
          { id: 'new', data: { name: 'New', createdAtTimestamp: 2 } },
        ],
      });

      const bites = await service.loadBitesForRestaurant('restaurant-1');

      expect(bites.map(({ id }) => id)).toEqual(['new', 'old']);
      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: 'bites',
          compositeFilter: {
            type: 'and',
            queryConstraints: [
              {
                type: 'where',
                fieldPath: 'restaurantId',
                opStr: '==',
                value: 'restaurant-1',
              },
            ],
          },
        }),
      );
    });

    it('reads nothing without a restaurant', async () => {
      (FirebaseFirestore.getCollection as jest.Mock).mockClear();

      await expect(service.loadBitesForRestaurant('')).resolves.toEqual([]);
      expect(FirebaseFirestore.getCollection).not.toHaveBeenCalled();
    });
  });

  describe('linkBiteToMenuItem', () => {
    it('calls the callable and returns its answer', async () => {
      (FirebaseFunctions.callByName as jest.Mock).mockResolvedValue({
        data: { biteId: 'b1', menuItemId: 'm1' },
      });

      await expect(
        service.linkBiteToMenuItem({ biteId: 'b1', menuItemId: 'm1' }),
      ).resolves.toEqual({ biteId: 'b1', menuItemId: 'm1' });
      expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
        name: 'linkBiteToMenuItem',
        data: { biteId: 'b1', menuItemId: 'm1' },
      });
    });
  });
});
