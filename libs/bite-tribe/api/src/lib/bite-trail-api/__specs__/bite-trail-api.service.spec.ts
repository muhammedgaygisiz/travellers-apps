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

    // Issue #2141: the trail is written `pending` and never carries its
    // photo; the finalize trigger publishes it once the image check passed it.
    it('writes the trail pending, without a photo, and uploads into its folder', async () => {
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
        imagePath: 'https://example.com/forged.jpg',
        location: 'Berlin',
        description: 'A trail',
        price: 0,
        currency: 'EUR',
      };

      const id = await service.createBiteTrail(trailData);

      expect(id).toBe('trail-123');
      const written = addDocumentSpy.mock.calls[0][0].data;
      expect(written.imageStatus).toBe('pending');
      expect(written).not.toHaveProperty('imagePath');
      expect(written).not.toHaveProperty('image');
      expect(uploadBase64Spy).toHaveBeenCalledWith({
        base64: 'data:image/png;base64,abc',
        docId: 'trail-123',
        collection: BITE_TRAIL_COLLECTION,
      });
      expect(getDownloadUrlFromFirebaseStorage).not.toHaveBeenCalled();
      expect(updateDocumentSpy).not.toHaveBeenCalled();
    });

    it('marks the trail failed and rethrows when the upload fails', async () => {
      jest
        .spyOn(uploadBase64Utils, 'uploadBase64ToFirebaseStorage')
        .mockRejectedValueOnce(new Error('storage offline'));
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
        imagePath: 'https://example.com/forged.jpg',
        location: 'Berlin',
        description: 'A trail',
        price: 0,
        currency: 'EUR',
      };

      await expect(service.createBiteTrail(trailData)).rejects.toThrow(
        'storage offline',
      );
      expect(updateDocumentSpy).toHaveBeenCalledWith({
        reference: `${BITE_TRAIL_COLLECTION}/trail-123`,
        data: { imageStatus: 'failed' },
      });
    });

    it('still rethrows the upload error when marking it failed is refused', async () => {
      jest
        .spyOn(uploadBase64Utils, 'uploadBase64ToFirebaseStorage')
        .mockRejectedValueOnce(new Error('storage offline'));
      updateDocumentSpy.mockRejectedValueOnce(new Error('offline'));
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
        imagePath: 'https://example.com/forged.jpg',
        location: 'Berlin',
        description: 'A trail',
        price: 0,
        currency: 'EUR',
      };

      await expect(service.createBiteTrail(trailData)).rejects.toThrow(
        'storage offline',
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
      expect(addDocumentSpy.mock.calls[0][0].data).not.toHaveProperty(
        'imageStatus',
      );
    });
  });

  describe('photoVerdict$', () => {
    it('listens to the trail and takes its first verdict', async () => {
      let listener: (event: unknown) => void = () => undefined;
      Object.assign(FirebaseFirestore, {
        addDocumentSnapshotListener: jest.fn(
          async (_options: unknown, callback: unknown) => {
            listener = callback as typeof listener;
            return 'listener-1';
          },
        ),
        removeSnapshotListener: jest.fn().mockResolvedValue(undefined),
      });
      const verdicts: unknown[] = [];

      service.photoVerdict$('trail-123').subscribe((v) => verdicts.push(v));
      await Promise.resolve();
      listener({ snapshot: { data: { imageStatus: 'pending' } } });
      listener({
        snapshot: { data: { imageStatus: 'refused' } },
      });

      expect(
        FirebaseFirestore.addDocumentSnapshotListener,
      ).toHaveBeenCalledWith(
        { reference: `${BITE_TRAIL_COLLECTION}/trail-123` },
        expect.any(Function),
      );
      expect(verdicts).toEqual([{ imageStatus: 'refused' }]);
    });
  });
});
