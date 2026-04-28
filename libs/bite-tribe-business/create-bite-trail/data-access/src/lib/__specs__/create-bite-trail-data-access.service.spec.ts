import { TestBed } from '@angular/core/testing';
import {
  CreateBiteTrailDataAccessService,
  USERS_COLLECTION,
  BITE_TRAIL_COLLECTION,
} from '../create-bite-trail-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { signal } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Bite, BiteTrail, PublicUser } from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';

jest.mock('@capacitor-firebase/firestore');
jest.mock('bite-tribe/api');

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
            organisationIdFromUrl: signal<string | undefined>(undefined),
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

  describe('selectedBites signal', () => {
    it('should start with empty array', () => {
      expect(service.selectedBites()).toEqual([]);
    });

    it('should allow setting bites', () => {
      const bites: Bite[] = [
        {
          id: 'bite-1',
          name: 'Pasta',
          image: '',
          place: 'Restaurant A',
          price: 12,
          position: { latitude: 0, longitude: 0 },
        },
      ];
      service.selectedBites.set(bites);
      expect(service.selectedBites()).toHaveLength(1);
    });
  });

  describe('employees signal', () => {
    it('should start with empty array', () => {
      expect(service.employees()).toEqual([]);
    });

    it('should allow setting employees', () => {
      const employees: PublicUser[] = [
        {
          userId: 'user-1',
          displayName: 'Alice',
          email: 'alice@example.com',
          photoUrl: '',
        },
      ];
      service.employees.set(employees);
      expect(service.employees()).toHaveLength(1);
    });
  });

  describe('organisationLoader', () => {
    it('should return undefined when organisationId is not provided', async () => {
      const result = await service.organisationLoader({ params: {} } as any);
      expect(result).toBeUndefined();
    });

    it('should return undefined when document has no data', async () => {
      jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
        snapshot: { id: 'org-1', data: null },
      } as any);

      const result = await service.organisationLoader({
        params: { organisationId: 'org-1' },
      } as any);

      expect(result).toBeUndefined();
    });

    it('should query Firestore users collection with the provided organisationId', async () => {
      const getDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue({
          snapshot: {
            id: 'org-1',
            data: { displayName: 'My Org', photoUrl: 'photo.jpg' },
          },
        } as any);

      const result = await service.organisationLoader({
        params: { organisationId: 'org-1' },
      } as any);

      expect(getDocumentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: `${USERS_COLLECTION}/org-1`,
        }),
      );
      expect((result as PublicUser).displayName).toBe('My Org');
      expect((result as PublicUser).userId).toBe('org-1');
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
      ownerId: 'org-1',
      ownerName: 'My Org',
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

