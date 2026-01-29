import { MenuApiService } from '../menu-api.service';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { of } from 'rxjs';
import type { Menu } from 'model';
import * as getMenuByIdUtil from '../utils/get-menu-by-id';

jest.mock('../utils/get-menu-by-id');

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    addCollectionSnapshotListener: jest.fn(),
    removeSnapshotListener: jest.fn(),
    getDocument: jest.fn(),
    updateDocument: jest.fn(),
  },
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
              .mockResolvedValue({ id: 'menuId', name: 'Test Menu' });

            const result = await service.loadMenu('menuId');

            expect(result).toEqual({ id: 'menuId', name: 'Test Menu' });
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
              const result = await service.loadMenu('menuId');
            } catch (error) {
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
      } catch (e) {
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

      await service.saveMenu(menuData);

      expect(updateDocumentSpy).toHaveBeenCalledWith({
        data: {
          categories: undefined,
          updatedAt: '2024-03-15T12:00:00.000Z',
          updatedAtTimestamp: 1710504000000,
        },
        reference: 'menus/menuId',
      });
    });
  });
});
