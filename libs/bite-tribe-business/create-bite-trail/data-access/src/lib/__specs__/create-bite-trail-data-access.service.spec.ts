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
import * as uploadBase64Utils from 'bite-tribe/api';
import { getDownloadUrlFromFirebaseStorage } from 'utils';

jest.mock('@capacitor-firebase/firestore');

jest.mock('bite-tribe/api', () => ({
  uploadBase64ToFirebaseStorage: jest
    .fn()
    .mockResolvedValue('biteTrails/trail-123.jpg'),
}));

jest.mock('utils', () => ({
  ...jest.requireActual('utils'),
  getDownloadUrlFromFirebaseStorage: jest
    .fn()
    .mockResolvedValue('https://storage.example.com/biteTrails/trail-123.jpg'),
}));

describe('CreateBiteTrailDataAccessService', () => {
  let service: CreateBiteTrailDataAccessService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CreateBiteTrailDataAccessService,
        {
          provide: BiteTribeStoreService,
          useValue: {
            organisationIdFromUrl: signal<string | undefined>(undefined),
          },
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
    let addDocumentSpy: jest.SpyInstance;
    let updateDocumentSpy: jest.SpyInstance;

    beforeEach(() => {
      addDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'addDocument')
        .mockResolvedValue({ reference: { id: 'trail-123' } } as any);
      updateDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'updateDocument')
        .mockResolvedValue({} as any);
    });

    afterEach(() => {
      addDocumentSpy.mockClear();
      updateDocumentSpy.mockClear();
      jest.clearAllMocks();
    });

    it('should call FirebaseFirestore.addDocument with trail data excluding image', async () => {
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

      await service.createBiteTrail(trailData);

      expect(addDocumentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: BITE_TRAIL_COLLECTION,
          data: expect.objectContaining({
            name: 'My Trail',
            ownerId: 'org-1',
            biteIds: ['bite-1', 'bite-2'],
            updatedAt: expect.any(String),
            updatedAtTimestamp: expect.any(Number),
          }),
        }),
      );
    });

    it('should not include base64 image in the Firestore document', async () => {
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
        biteIds: [],
        image: 'data:image/png;base64,abc',
        imagePath: '',
        location: 'Berlin',
        description: 'A trail',
        price: 0,
        currency: 'EUR',
      };

      await service.createBiteTrail(trailData);

      expect(addDocumentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ image: 'data:image/png;base64,abc' }),
        }),
      );
    });

    it('should upload image and update document with imagePath when image is provided', async () => {
      const uploadBase64Spy = jest.spyOn(
        uploadBase64Utils,
        'uploadBase64ToFirebaseStorage',
      );

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
        biteIds: [],
        image: 'data:image/png;base64,abc',
        imagePath: '',
        location: 'Berlin',
        description: 'A trail',
        price: 0,
        currency: 'EUR',
      };

      await service.createBiteTrail(trailData);

      expect(uploadBase64Spy).toHaveBeenCalledWith({
        base64: 'data:image/png;base64,abc',
        docId: 'trail-123',
        collection: BITE_TRAIL_COLLECTION,
      });

      expect(getDownloadUrlFromFirebaseStorage).toHaveBeenCalledWith(
        'biteTrails/trail-123.jpg',
      );

      expect(updateDocumentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: `${BITE_TRAIL_COLLECTION}/trail-123`,
          data: expect.objectContaining({
            imagePath: 'https://storage.example.com/biteTrails/trail-123.jpg',
          }),
        }),
      );
    });

    it('should not upload image when no image is provided', async () => {
      const uploadBase64Spy = jest.spyOn(
        uploadBase64Utils,
        'uploadBase64ToFirebaseStorage',
      );

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
        biteIds: [],
        imagePath: '',
        location: 'Berlin',
        description: 'A trail',
        price: 0,
        currency: 'EUR',
      };

      await service.createBiteTrail(trailData);

      expect(uploadBase64Spy).not.toHaveBeenCalled();
      expect(updateDocumentSpy).not.toHaveBeenCalled();
    });
  });
});
