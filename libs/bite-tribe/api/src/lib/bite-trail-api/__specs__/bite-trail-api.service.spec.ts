import { TestBed } from '@angular/core/testing';
import { BiteTrailApiService } from '../bite-trail-api.service';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BiteTrail } from 'model';
import * as uploadBase64Utils from '../../utils/upload-base64-to-firebase-storage';
import { getDownloadUrlFromFirebaseStorage } from 'utils';

jest.mock('@capacitor-firebase/firestore');

jest.mock('../../utils/upload-base64-to-firebase-storage', () => ({
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

const BITE_TRAIL_COLLECTION = 'biteTrails';

describe('BiteTrailApiService', () => {
  let service: BiteTrailApiService;
  const mockDate = new Date('2024-03-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);

    TestBed.configureTestingModule({});
    service = TestBed.inject(BiteTrailApiService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
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
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
            updatedAt: '2024-03-15T12:00:00.000Z',
            updatedAtTimestamp: 1710504000000,
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
          data: expect.not.objectContaining({
            image: 'data:image/png;base64,abc',
          }),
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
            imagePath:
              'https://storage.example.com/biteTrails/trail-123.jpg',
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
