import { LikeApiService } from '../like-api.service';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    addCollectionGroupSnapshotListener: jest.fn(),
  },
}));

const MockedAuthService = {
  authState: (): any => ({ user: { uid: '123' } }),
};

describe(LikeApiService.name, () => {
  let service: LikeApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: MockedAuthService }],
    });

    service = TestBed.inject(LikeApiService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('startListener', () => {
    let addCollectionGroupSnapshotListenerMock: jest.SpyInstance;

    beforeEach(() => {
      addCollectionGroupSnapshotListenerMock = jest
        .spyOn(FirebaseFirestore, 'addCollectionGroupSnapshotListener')
        .mockResolvedValue('callbackId');
    });

    it('should start the listener', async () => {
      await service.startListener();

      expect(addCollectionGroupSnapshotListenerMock).toHaveBeenCalled();
    });
  });

  // describe('handleResponse', () => {
  //
  // });
});
