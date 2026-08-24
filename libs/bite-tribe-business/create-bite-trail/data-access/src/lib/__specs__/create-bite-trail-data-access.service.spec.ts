import { TestBed } from '@angular/core/testing';
import {
  BITE_COLLECTION,
  CreateBiteTrailDataAccessService,
  USERS_COLLECTION,
} from '../create-bite-trail-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ResourceLoaderParams, signal } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Bite, BiteTrail, PublicUser } from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';

jest.mock('@capacitor-firebase/firestore');
jest.mock('bite-tribe/api');

const createLoaderParams = (
  userId?: string,
): ResourceLoaderParams<{ userId: string | undefined }> => ({
  params: { userId },
  abortSignal: new AbortController().signal,
  previous: { status: 'idle' },
});

const snapshotMetadata = {
  fromCache: false,
  hasPendingWrites: false,
};

describe('CreateBiteTrailDataAccessService', () => {
  let service: CreateBiteTrailDataAccessService;
  let apiMock: jest.Mocked<BiteTribeApiService>;

  beforeEach(() => {
    apiMock = {
      createBiteTrail: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<BiteTribeApiService>;

    TestBed.configureTestingModule({
      providers: [
        CreateBiteTrailDataAccessService,
        {
          provide: BiteTribeStoreService,
          useValue: {
            user: signal<{ uid: string } | undefined>(undefined),
          },
        },
        {
          provide: BiteTribeApiService,
          useValue: apiMock,
        },
      ],
    });

    service = TestBed.inject(CreateBiteTrailDataAccessService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('ownerLoader', () => {
    it('should return undefined when no user id is provided', async () => {
      const result = await service.ownerLoader(createLoaderParams());
      expect(result).toBeUndefined();
    });

    it('should return undefined when the document has no data', async () => {
      jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
        snapshot: {
          id: 'user-1',
          path: `${USERS_COLLECTION}/user-1`,
          data: null,
          metadata: snapshotMetadata,
        },
      });

      const result = await service.ownerLoader(createLoaderParams('user-1'));

      expect(result).toBeUndefined();
    });

    it('should load the owner document for the given user id', async () => {
      const getDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue({
          snapshot: {
            id: 'user-1',
            path: `${USERS_COLLECTION}/user-1`,
            data: { displayName: 'Mo', photoUrl: 'photo.jpg' },
            metadata: snapshotMetadata,
          },
        });

      const result = await service.ownerLoader(createLoaderParams('user-1'));

      expect(getDocumentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: `${USERS_COLLECTION}/user-1`,
        }),
      );
      expect((result as PublicUser).displayName).toBe('Mo');
      expect((result as PublicUser).userId).toBe('user-1');
    });
  });

  describe('bitesLoader', () => {
    it('should return an empty list when no user id is provided', async () => {
      const result = await service.bitesLoader(createLoaderParams());
      expect(result).toEqual([]);
    });

    it('should query the Bites owned by the given user', async () => {
      const getCollectionSpy = jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue({
          snapshots: [{ id: 'bite-1', data: { name: 'Pasta' } }],
        } as unknown as Awaited<
          ReturnType<typeof FirebaseFirestore.getCollection>
        >);

      const result = await service.bitesLoader(createLoaderParams('user-1'));

      expect(getCollectionSpy).toHaveBeenCalledWith({
        reference: BITE_COLLECTION,
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: 'userId',
              opStr: '==',
              value: 'user-1',
            },
          ],
        },
      });
      expect(result).toEqual([{ id: 'bite-1', name: 'Pasta' } as Bite]);
    });

    it('should return an empty list when there are no snapshots', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue(
          {} as unknown as Awaited<
            ReturnType<typeof FirebaseFirestore.getCollection>
          >,
        );

      const result = await service.bitesLoader(createLoaderParams('user-1'));

      expect(result).toEqual([]);
    });
  });

  describe('createBiteTrail', () => {
    const trailData: Omit<
      BiteTrail,
      | 'id'
      | 'createdAt'
      | 'createdAtTimestamp'
      | 'updatedAt'
      | 'updatedAtTimestamp'
    > = {
      ownerId: 'user-1',
      ownerName: 'Mo',
      ownerImagePath: 'photo.jpg',
      name: 'My Trail',
      biteIds: ['bite-1', 'bite-2'],
      imagePath: '',
      location: 'Berlin',
      description: 'A trail',
      price: 0,
      currency: 'EUR',
    };

    it('should delegate to BiteTribeApiService.createBiteTrail', async () => {
      await service.createBiteTrail(trailData);

      expect(apiMock.createBiteTrail).toHaveBeenCalledWith(trailData);
    });

    it('should return the promise from the api', async () => {
      const result = service.createBiteTrail(trailData);

      expect(result).toBeInstanceOf(Promise);
    });
  });
});
