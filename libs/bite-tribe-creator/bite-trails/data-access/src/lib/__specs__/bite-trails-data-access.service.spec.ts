import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BiteTribeStoreService } from 'bite-tribe/store';
import {
  BITE_TRAIL_COLLECTION,
  BiteTrailsDataAccessService,
} from '../bite-trails-data-access.service';
import { BiteTrail } from 'model';
import { signal } from '@angular/core';

jest.mock('@capacitor-firebase/firestore');
jest.mock('bite-tribe/store', () => ({
  BiteTribeStoreService: class BiteTribeStoreService {},
}));

type FirestoreCollection = Awaited<
  ReturnType<typeof FirebaseFirestore.getCollection>
>;

describe(BiteTrailsDataAccessService.name, () => {
  let storeServiceMock: {
    isAuthenticated$: ReturnType<typeof of<boolean>>;
    user: ReturnType<typeof signal<{ uid: string } | undefined>>;
    logout: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    storeServiceMock = {
      isAuthenticated$: of(false),
      user: signal<{ uid: string } | undefined>(undefined),
      logout: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        BiteTrailsDataAccessService,
        { provide: BiteTribeStoreService, useValue: storeServiceMock },
      ],
    });
  });

  describe('biteTrailsLoader', () => {
    const createParams = (userId?: string): never =>
      ({ params: { userId } }) as never;

    it('should return an empty list without a signed-in user', async () => {
      const service = TestBed.inject(BiteTrailsDataAccessService);

      const result = await service.biteTrailsLoader(createParams());

      expect(FirebaseFirestore.getCollection).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should load the BiteTrails owned by the signed-in user', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [{ id: 'trail-1', data: { name: 'Bern Brunch Walk' } }],
      } as unknown as FirestoreCollection);

      const service = TestBed.inject(BiteTrailsDataAccessService);
      const result = await service.biteTrailsLoader(createParams('user-1'));

      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: BITE_TRAIL_COLLECTION,
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: 'ownerId',
              opStr: '==',
              value: 'user-1',
            },
          ],
        },
      });
      expect(result).toEqual([
        { id: 'trail-1', name: 'Bern Brunch Walk' } as BiteTrail,
      ]);
    });

    it('should return an empty list when there are no snapshots', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue({} as unknown as FirestoreCollection);

      const service = TestBed.inject(BiteTrailsDataAccessService);
      const result = await service.biteTrailsLoader(createParams('user-1'));

      expect(result).toEqual([]);
    });
  });

  describe('logout', () => {
    it('should delegate logout to the store service', () => {
      const service = TestBed.inject(BiteTrailsDataAccessService);

      service.logout();

      expect(storeServiceMock.logout).toHaveBeenCalled();
    });
  });
});
