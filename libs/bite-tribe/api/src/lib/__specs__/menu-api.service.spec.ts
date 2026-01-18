import { MenuApiService } from '../menu-api.service';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { TestScheduler } from 'rxjs/testing';
import { of } from 'rxjs';
import type { Menu } from 'model';

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

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
  let scheduler: TestScheduler;
  let authService: AuthService;
  const mockDate = new Date('2024-03-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    scheduler = new TestScheduler(assertDeepEqual);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: MockedAuthService }],
    });

    service = TestBed.inject(MenuApiService);
    authService = TestBed.inject(AuthService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('startListener', () => {
    let addCollectionSnapshotListenerSpy: jest.SpyInstance;

    beforeEach(() => {
      addCollectionSnapshotListenerSpy = jest
        .spyOn(FirebaseFirestore, 'addCollectionSnapshotListener')
        .mockResolvedValue('mocked-callback-id');
    });

    it('should start the listener', async () => {
      await service.startListener();

      expect(addCollectionSnapshotListenerSpy).toHaveBeenCalled();
    });
  });

  describe('handleResponse', () => {
    let nextSpy: jest.SpyInstance;

    beforeEach(() => {
      nextSpy = jest
        .spyOn((service as any)._menusChannel$, 'next')
        .mockImplementation();
    });

    it('should handle the response and update menus channel', () => {
      const mockDocs = {
        snapshots: [
          { id: '1', data: { name: 'Menu 1' } },
          { id: '2', data: { name: 'Menu 2' } },
        ],
      } as any;

      service.handleResponse(mockDocs);

      expect(nextSpy).toHaveBeenCalled();
    });
  });

  describe('stopMenuListener', () => {
    it('should call stopped$.next and removeSnapshotListener', async () => {
      const removeSnapshotListenerSpy = jest
        .spyOn(FirebaseFirestore, 'removeSnapshotListener')
        .mockResolvedValue();

      const callbackId = 'test-callback-id';

      await service.stopMenuListener(callbackId);

      expect(removeSnapshotListenerSpy).toHaveBeenCalledWith({
        callbackId,
      });
    });
  });

  describe('loadMenu', () => {
    describe('given logged in true', () => {
      describe('and no menuId', () => {
        it('should return EMPTY', () => {
          scheduler.run(({ expectObservable }) => {
            const result$ = service.loadMenu('');

            expectObservable(result$).toBe('|');
          });
        });
      });

      describe('given a menuId', () => {
        describe('and a successful call of getMenuById', () => {
          it('should call getMenuById', () => {
            jest
              .spyOn(service as any, 'getMenuById')
              .mockReturnValue(of({ id: 'menuId', name: 'Test Menu' }));

            scheduler.run(({ expectObservable }) => {
              const result$ = service.loadMenu('menuId');

              expectObservable(result$).toBe('(a|)', {
                a: { id: 'menuId', name: 'Test Menu' },
              });
            });
          });
        });

        describe('and a failing call to getMenuById', () => {
          beforeEach(() => {
            const error = new Error('Test error');
            jest.spyOn(service as any, 'getMenuById').mockImplementation(() => {
              throw error;
            });
          });

          it('should return EMPTY', () => {
            scheduler.run(({ expectObservable }) => {
              const result$ = service.loadMenu('menuId');
              expectObservable(result$).toBe(
                '#',
                null,
                new Error('Test error'),
              );
            });
          });
        });
      });
    });
  });

  describe('getMenuById', () => {
    it('should process response and call FirebaseFirestore.getDocument', async () => {
      const getDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue({
          snapshot: {
            data: {
              id: 'menuId',
              name: 'Test Menu',
            },
          },
        } as any);

      const result = await service.getMenuById('menuId');

      expect(result).toEqual({
        id: 'menuId',
        name: 'Test Menu',
      });
      expect(getDocumentSpy).toHaveBeenCalledTimes(1);
    });

    describe('given no data returned', () => {
      it('should return undefined', async () => {
        jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
          snapshot: {
            data: null,
          },
        } as any);

        const result = await service.getMenuById('menuId');

        expect(result).toBeUndefined();
      });
    });

    describe('given an error', () => {
      it('should return undefined', async () => {
        jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockRejectedValue(new Error('Test error'));

        const result = await service.getMenuById('menuId');
        return expect(result).toBeUndefined();
      });
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
