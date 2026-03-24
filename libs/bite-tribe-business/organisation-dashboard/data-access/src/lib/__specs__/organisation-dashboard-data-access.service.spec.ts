import { TestBed } from '@angular/core/testing';
import {
  OrganisationDashboardDataAccessService,
  BITE_COLLECTION,
  USERS_COLLECTION,
} from '../organisation-dashboard-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { signal } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

jest.mock('@capacitor-firebase/firestore');

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
      const result = await service.bitesLoader({ params: {} } as any);

      expect(result).toEqual([]);
    });

    it('should return empty array when userIds is an empty array', async () => {
      const result = await service.bitesLoader({
        params: { userIds: [] },
      } as any);

      expect(result).toEqual([]);
    });

    it('should query Firestore bites collection for each provided userId', async () => {
      const getCollectionSpy = jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue({
          snapshots: [
            { id: 'bite-1', data: { name: 'Pasta', userId: 'user-1' } },
          ],
        } as any);

      const result = await service.bitesLoader({
        params: { userIds: ['user-1'] },
      } as any);

      expect(getCollectionSpy).toHaveBeenCalledWith(
        expect.objectContaining({ reference: BITE_COLLECTION }),
      );
      expect(result).toHaveLength(1);
      expect((result as any)[0].id).toBe('bite-1');
      expect((result as any)[0].name).toBe('Pasta');
    });

    it('should aggregate bites from multiple users', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockImplementation(({ compositeFilter }: any) => {
          const userId = compositeFilter.queryConstraints[0].value;
          if (userId === 'user-1') {
            return Promise.resolve({
              snapshots: [
                { id: 'bite-1', data: { name: 'Pasta', userId: 'user-1' } },
              ],
            } as any);
          }
          if (userId === 'user-2') {
            return Promise.resolve({
              snapshots: [
                { id: 'bite-2', data: { name: 'Pizza', userId: 'user-2' } },
              ],
            } as any);
          }
          return Promise.resolve({ snapshots: [] } as any);
        });

      const result = await service.bitesLoader({
        params: { userIds: ['user-1', 'user-2'] },
      } as any);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no bites snapshots found', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [],
      } as any);

      const result = await service.bitesLoader({
        params: { userIds: ['user-1'] },
      } as any);

      expect(result).toEqual([]);
    });
  });

  describe('employeesLoader', () => {
    it('should return empty array when organisationId is not provided', async () => {
      const result = await service.employeesLoader({ params: {} } as any);

      expect(result).toEqual([]);
    });

    it('should query Firestore users collection with the provided organisationId', async () => {
      const getCollectionSpy = jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue({
          snapshots: [
            {
              id: 'user-1',
              data: { displayName: 'Alice', organisationId: 'org-1' },
            },
          ],
        } as any);

      const result = await service.employeesLoader({
        params: { organisationId: 'org-1' },
      } as any);

      expect(getCollectionSpy).toHaveBeenCalledWith(
        expect.objectContaining({ reference: USERS_COLLECTION }),
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no user snapshots found', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
        snapshots: [],
      } as any);

      const result = await service.employeesLoader({
        params: { organisationId: 'org-1' },
      } as any);

      expect(result).toEqual([]);
    });
  });
});
