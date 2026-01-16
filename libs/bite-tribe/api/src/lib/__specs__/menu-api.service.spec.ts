import { MenuApiService } from '../menu-api.service';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    addCollectionSnapshotListener: jest.fn(),
    removeSnapshotListener: jest.fn(),
  },
}));

const MockedAuthService = {
  authState: (): any => ({ user: { uid: '123' } }),
};

describe(MenuApiService.name, () => {
  let service: MenuApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: MockedAuthService }],
    });

    service = TestBed.inject(MenuApiService);
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

      expect(nextSpy);
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
});
