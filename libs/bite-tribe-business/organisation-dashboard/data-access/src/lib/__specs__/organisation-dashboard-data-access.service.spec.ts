import { TestBed } from '@angular/core/testing';
import {
  OrganisationDashboardDataAccessService,
  BITE_COLLECTION,
  BITE_TRAIL_COLLECTION,
  USERS_COLLECTION,
} from '../organisation-dashboard-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ResourceLoaderParams, signal } from '@angular/core';
import {
  DocumentSnapshot,
  FirebaseFirestore,
} from '@capacitor-firebase/firestore';
import { Bite, BiteTrail, PublicUser } from 'model';

jest.mock('@capacitor-firebase/firestore');

const createLoaderParams = <T extends object>(
  params: T,
): ResourceLoaderParams<T> => ({
  params,
  abortSignal: new AbortController().signal,
  previous: { status: 'idle' },
});

const createSnapshot = <T>(id: string, data: T): DocumentSnapshot<T> => ({
  id,
  path: `test/${id}`,
  data,
  metadata: { fromCache: false, hasPendingWrites: false },
});

const createBite = (id: string, name: string, userId: string): Bite => ({
  id,
  name,
  userId,
  image: '',
  place: '',
  price: 0,
  position: { latitude: 0, longitude: 0 },
});

const createEmployee = (): PublicUser => ({
  userId: 'user-1',
  displayName: 'Alice',
  email: 'alice@example.com',
  photoUrl: '',
});

const createBiteTrail = (): BiteTrail => ({
  id: 'trail-1',
  ownerId: 'org-1',
  name: 'Trail One',
  biteIds: [],
  imagePath: '',
  ownerImagePath: '',
  ownerName: '',
  location: '',
  description: '',
  price: 0,
  currency: 'EUR',
});

describe('OrganisationDashboardDataAccessService', () => {
  let service: OrganisationDashboardDataAccessService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OrganisationDashboardDataAccessService,
        {
          provide: BiteTribeStoreService,
          useValue: {
            organisationIdFromUrl: signal(undefined),
          },
        },
      ],
    });

    service = TestBed.inject(OrganisationDashboardDataAccessService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('bitesLoader', () => {
    it('should return empty array when userIds is not provided', async () => {
      const result = await service.bitesLoader(
        createLoaderParams({ userIds: undefined }),
      );

      expect(result).toEqual([]);
    });

    it('should return empty array when userIds is an empty array', async () => {
      const result = await service.bitesLoader({
        ...createLoaderParams({ userIds: [] }),
      });

      expect(result).toEqual([]);
    });

    it('should query Firestore bites collection for each provided userId', async () => {
      const getCollectionSpy = jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue({
          snapshots: [
            createSnapshot('bite-1', createBite('bite-1', 'Pasta', 'user-1')),
          ],
        });

      const result = await service.bitesLoader(
        createLoaderParams({ userIds: ['user-1'] }),
      );

      expect(getCollectionSpy).toHaveBeenCalledWith(
        expect.objectContaining({ reference: BITE_COLLECTION }),
      );
      expect(result).toHaveLength(1);
      expect(result?.[0].id).toBe('bite-1');
      expect(result?.[0].name).toBe('Pasta');
    });

    it('should aggregate bites from multiple users', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValueOnce({
          snapshots: [
            createSnapshot('bite-1', createBite('bite-1', 'Pasta', 'user-1')),
          ],
        })
        .mockResolvedValueOnce({
          snapshots: [
            createSnapshot('bite-2', createBite('bite-2', 'Pizza', 'user-2')),
          ],
        });

      const result = await service.bitesLoader(
        createLoaderParams({ userIds: ['user-1', 'user-2'] }),
      );

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no bites snapshots found', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [],
      });

      const result = await service.bitesLoader(
        createLoaderParams({ userIds: ['user-1'] }),
      );

      expect(result).toEqual([]);
    });
  });

  describe('employeesLoader', () => {
    it('should return empty array when organisationId is not provided', async () => {
      const result = await service.employeesLoader(
        createLoaderParams({ organisationId: undefined }),
      );

      expect(result).toEqual([]);
    });

    it('should query Firestore users collection with the provided organisationId', async () => {
      const getCollectionSpy = jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue({
          snapshots: [createSnapshot('user-1', createEmployee())],
        });

      const result = await service.employeesLoader(
        createLoaderParams({ organisationId: 'org-1' }),
      );

      expect(getCollectionSpy).toHaveBeenCalledWith(
        expect.objectContaining({ reference: USERS_COLLECTION }),
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no user snapshots found', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [],
      });

      const result = await service.employeesLoader(
        createLoaderParams({ organisationId: 'org-1' }),
      );

      expect(result).toEqual([]);
    });
  });

  describe('biteTrailsLoader', () => {
    it('should return empty array when organisationId is not provided', async () => {
      const result = await service.biteTrailsLoader(
        createLoaderParams({ organisationId: undefined }),
      );

      expect(result).toEqual([]);
    });

    it('should query Firestore biteTrails collection with the provided organisationId', async () => {
      const getCollectionSpy = jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue({
          snapshots: [createSnapshot('trail-1', createBiteTrail())],
        });

      const result = await service.biteTrailsLoader(
        createLoaderParams({ organisationId: 'org-1' }),
      );

      expect(getCollectionSpy).toHaveBeenCalledWith(
        expect.objectContaining({ reference: BITE_TRAIL_COLLECTION }),
      );
      expect(result).toHaveLength(1);
      expect(result?.[0].id).toBe('trail-1');
      expect(result?.[0].name).toBe('Trail One');
    });

    it('should return empty array when no bite trail snapshots found', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [],
      });

      const result = await service.biteTrailsLoader(
        createLoaderParams({ organisationId: 'org-1' }),
      );

      expect(result).toEqual([]);
    });
  });
});
