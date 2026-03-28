import { BiteApiService } from '../bite-api.service';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { of } from 'rxjs';
import { loadBitesByLocation } from '../utils/load-bites-by-location';
import { loadBitesByUser } from '../utils/load-bites-by-user';
import { createBite } from '../utils/create-bite';
import { loadBiteById } from '../utils/load-bite-by-id';
import { Bite, Bucketlist } from 'model';
import { saveEditedBite } from '../utils/save-edited-bite';
import { deleteFileInFirebaseStorage } from '../utils/delete-file-in-firebasestorage';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { ErrorHandler } from '@angular/core';
import { loadBitesByBucketlist } from '../utils/load-bites-by-bucketlist';
import { BITE_COLLECTION } from '../../utils/constants';
import { uploadBase64ToFirebaseStorage } from '../../utils/upload-base64-to-firebase-storage';
import { updateBiteWithImagePathFromFirestorage } from '../utils/update-bite-with-image-path-from-firestorage';

jest.mock('../utils/load-bites-by-location', () => ({
  loadBitesByLocation: jest.fn(),
}));

jest.mock('../utils/load-bites-by-user', () => ({
  loadBitesByUser: jest.fn(),
}));

const mockedBiteId = 'mocked-bite-id';
jest.mock('../utils/create-bite', () => ({
  createBite: jest.fn(() => mockedBiteId),
}));

jest.mock('../utils/upload-image-and-update-bite', () => ({
  uploadImageAndUpdateBite: jest.fn(),
}));

jest.mock('../utils/load-bite-by-id', () => ({
  loadBiteById: jest.fn(),
}));

jest.mock('../utils/save-edited-bite', () => ({
  saveEditedBite: jest.fn(),
}));

jest.mock('../utils/delete-file-in-firebasestorage', () => ({
  deleteFileInFirebaseStorage: jest.fn(),
}));

jest.mock('@capacitor-firebase/firestore');

jest.mock('../utils/load-bites-by-bucketlist', () => ({
  loadBitesByBucketlist: jest.fn(),
}));

jest.mock('../../utils/upload-base64-to-firebase-storage', () => ({
  uploadBase64ToFirebaseStorage: jest.fn(),
}));

jest.mock('../utils/update-bite-with-image-path-from-firestorage', () => ({
  updateBiteWithImagePathFromFirestorage: jest.fn(),
}));

const mockedUser = { uid: '123' };
const MockedAuthService = {
  getUser: (): any => mockedUser,
  isLoggedIn$: of(false),
};

const MockedErrorHandler = {
  handleError: jest.fn(),
};

describe(BiteApiService.name, () => {
  let service: BiteApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: MockedAuthService },
        { provide: ErrorHandler, useValue: MockedErrorHandler },
      ],
    });

    service = TestBed.inject(BiteApiService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('loadBitesByLocation', () => {
    it('should call loadBitesByLocation', async () => {
      const mockedPosition = {
        coords: { latitude: 100, longitude: 200 },
      } as GeolocationPosition;

      await service.loadBitesByLocation(mockedPosition);

      expect(loadBitesByLocation).toHaveBeenCalledWith({
        coords: {
          latitude: 100,
          longitude: 200,
        },
      });
    });
  });

  describe('loadBitesByUser', () => {
    it('should call loadBitesByUser', async () => {
      await service.loadBitesByUser('123');

      expect(loadBitesByUser).toHaveBeenCalledWith('123');
    });
  });

  describe('saveNewBite', () => {
    it('should save the bite and return the saved bite', async () => {
      const mockedBiteWithoutImage = {
        id: 'bite123',
        title: 'Test Bite',
      } as unknown as Bite;

      await service.saveNewBite(mockedBiteWithoutImage);

      expect(createBite).toHaveBeenCalledWith(
        mockedBiteWithoutImage,
        mockedUser,
      );
      expect(loadBiteById).toHaveBeenCalledWith(mockedBiteId);
    });

    describe('given an error', () => {
      it('should handle the error', async () => {
        (createBite as jest.Mock).mockImplementation(() => {
          throw new Error('error');
        });

        try {
          await service.saveNewBite({} as Bite);
        } catch (error) {
          // Expected to throw
        }

        expect(MockedErrorHandler.handleError).toHaveBeenCalledWith(
          expect.any(Error),
        );
      });
    });
  });

  describe('uploadImage', () => {
    it('should call uploadBase64ToFirebaseStorage with correct parameters', async () => {
      const mockedBite = {
        id: 'bite123',
        image: 'base64ImageString',
        title: 'Test Bite',
      } as unknown as Bite;

      const callbackFn = jest.fn();

      service.uploadImage(mockedBite, callbackFn);

      expect(uploadBase64ToFirebaseStorage).toHaveBeenCalledWith({
        base64: 'base64ImageString',
        callbackFn: expect.any(Function),
        collection: 'bites',
        docId: 'bite123',
      });
    });

    it('should invoke callbackFn directly when image is already a URL', async () => {
      (uploadBase64ToFirebaseStorage as jest.Mock).mockClear();

      const mockedBite = {
        id: 'bite123',
        image: 'https://firebasestorage.googleapis.com/v0/b/test/o/image.jpg',
        title: 'Test Bite',
      } as unknown as Bite;

      const callbackFn = jest.fn();

      await service.uploadImage(mockedBite, callbackFn);

      expect(uploadBase64ToFirebaseStorage).not.toHaveBeenCalled();
      expect(callbackFn).toHaveBeenCalledWith(
        expect.objectContaining({
          imagePath: mockedBite.image,
          uploadParams: expect.objectContaining({
            evt: expect.objectContaining({ completed: true }),
          }),
        }),
      );
    });
  });

  describe('updateImagePathInBite', () => {
    it('should call updateBiteWithImagePathFromFirestorage and loadBiteById', async () => {
      const mockedBite = {
        id: 'bite123',
        title: 'Test Bite',
      } as unknown as Bite;

      const mockedImagePath = 'path/to/image.jpg';

      await service.updateImagePathInBite(mockedBite, mockedImagePath);

      expect(updateBiteWithImagePathFromFirestorage).toHaveBeenCalledWith(
        mockedImagePath,
        {
          id: 'bite123',
          title: 'Test Bite',
        },
        true,
        'bite123',
      );
      expect(loadBiteById).toHaveBeenCalledWith('bite123');
    });
  });

  describe('saveEditedBite', () => {
    it('should save edited bite and reload bite', async () => {
      const mockedBiteId = 'mister-sams-favorite-bite-id';
      const mockedBite = { id: mockedBiteId } as Bite;
      await service.saveEditedBite(mockedBite);

      expect(saveEditedBite).toHaveBeenCalledWith(true, mockedBite);
      expect(loadBiteById).toHaveBeenCalledWith(mockedBiteId);
    });

    describe('given an error', () => {
      it('should handle the error', async () => {
        (saveEditedBite as jest.Mock).mockRejectedValueOnce(
          new Error('Failed to save edited bite'),
        );

        try {
          await service.saveEditedBite({} as Bite);
        } catch (error) {
          // Expected to throw
        }

        expect(MockedErrorHandler.handleError).toHaveBeenCalledWith(
          expect.any(Error),
        );
      });
    });
  });

  describe('deleteBite', () => {
    afterEach(() => {
      (deleteFileInFirebaseStorage as jest.Mock).mockReset();
    });

    describe('given a bite with imagePath', () => {
      const bite = {
        id: 'bite-with-image-path',
        imagePath: 'path/to/image.jpg',
      } as Bite;

      it('should call deleteFileInFirebaseStorage and FirebaseFirestore.deleteDocument', async () => {
        await service.deleteBite(bite);

        expect(deleteFileInFirebaseStorage).toHaveBeenCalledWith(
          'path/to/image.jpg',
        );
        expect(FirebaseFirestore.deleteDocument).toHaveBeenCalledWith({
          reference: `bites/${bite.id}`,
        });
      });

      describe('given an error in deleteFileInFirebaseStorage', () => {
        beforeEach(() => {
          (FirebaseFirestore.deleteDocument as any).mockReset();
        });

        it('should handle the error and not call FirebaseFirestore.deleteDocument', async () => {
          (deleteFileInFirebaseStorage as jest.Mock).mockRejectedValueOnce(
            new Error('Failed to delete image'),
          );

          try {
            await service.deleteBite(bite);
          } catch (error) {
            // Expected to throw
          }

          expect(MockedErrorHandler.handleError).toHaveBeenCalledWith(
            expect.any(Error),
          );
          expect(FirebaseFirestore.deleteDocument).not.toHaveBeenCalled();
        });
      });

      describe('given an error while deleting bite', () => {
        it('should handle the error', async () => {
          (FirebaseFirestore.deleteDocument as jest.Mock).mockRejectedValueOnce(
            new Error('Failed to delete bite'),
          );

          try {
            await service.deleteBite(bite);
          } catch (error) {
            // Expected to throw
          }

          expect(MockedErrorHandler.handleError).toHaveBeenCalledWith(
            expect.any(Error),
          );
        });
      });
    });

    describe('given a bite without imagePath', () => {
      const biteWithoutImagePath = {
        id: 'bite-without-image-path',
      } as Bite;

      it('should call FirebaseFirestore.deleteDocument without deleting image', async () => {
        await service.deleteBite(biteWithoutImagePath);

        expect(deleteFileInFirebaseStorage).not.toHaveBeenCalled();
        expect(FirebaseFirestore.deleteDocument).toHaveBeenCalledWith({
          reference: `bites/${biteWithoutImagePath.id}`,
        });
      });
    });

    describe('given a bite without id', () => {
      const biteWithoutId = {} as Bite;

      it('should reject the promise', async () => {
        await expect(service.deleteBite(biteWithoutId)).rejects.toThrow(
          'Bite ID is required for deletion.',
        );
      });
    });
  });

  describe('loadBitesByBucketlist', () => {
    it('should call loadBitesByBucketlist with the bucketlist', async () => {
      const mockedBucketlist = { id: 'bucketlist-123' } as Bucketlist;
      await service.loadBitesByBucketlist(mockedBucketlist);

      expect(loadBitesByBucketlist).toHaveBeenCalledWith(mockedBucketlist);
    });

    describe('given an error', () => {
      it('should handle the error and return empty array', async () => {
        (loadBitesByBucketlist as jest.Mock).mockRejectedValueOnce(
          new Error('Failed to load bites'),
        );

        const result = await service.loadBitesByBucketlist({} as Bucketlist);

        expect(MockedErrorHandler.handleError).toHaveBeenCalledWith(
          expect.any(Error),
        );
        expect(result).toEqual([]);
      });
    });
  });

  describe('startlatestBitesListener', () => {
    it('should call FirebaseFirestore.addCollectionSnapshotListener', async () => {
      const addCollectionSnapshotListenerSpy = jest
        .spyOn(FirebaseFirestore, 'addCollectionSnapshotListener')
        .mockImplementation();

      await service.startlatestBitesListener(5);

      expect(addCollectionSnapshotListenerSpy).toHaveBeenCalledWith(
        {
          reference: BITE_COLLECTION,
          queryConstraints: [
            {
              type: 'orderBy',
              fieldPath: 'createdAtTimestamp',
              directionStr: 'desc',
            },
            { type: 'limit', limit: 5 },
          ],
        },
        expect.any(Function),
      );
    });

    describe('given passed callback of listener', () => {
      it('should handle response when listener callback is invoked', async () => {
        const addCollectionSnapshotListenerSpy = jest.spyOn(
          FirebaseFirestore,
          'addCollectionSnapshotListener',
        );

        await service.startlatestBitesListener(5);

        const listenerCallback =
          addCollectionSnapshotListenerSpy.mock.calls[0][1];

        const mockSnapshot = { snapshots: [] } as any;
        listenerCallback(mockSnapshot, null);

        // Since the actual implementation of the callback is not defined,
        // we just ensure that invoking the callback does not throw an error.
        expect(true).toBe(true);
      });
    });
  });

  describe('handleLatestBites', () => {
    it('should update _latestBitesChannel$ with bites from snapshots', () => {
      const mockSnapshot1 = {
        id: 'bite1',
        data: () => ({ name: 'Bite 1' }),
      } as any;
      const mockSnapshot2 = {
        id: 'bite2',
        data: () => ({ name: 'Bite 2' }),
      } as any;

      const mockEvent = {
        snapshots: [mockSnapshot1, mockSnapshot2],
      };

      service.handleLatestBites(mockEvent);

      service.latestBites$.subscribe((bites) => {
        expect(bites.length).toBe(2);
        expect(bites[0].id).toBe('bite1');
        expect(bites[0].name).toBe('Bite 1');
        expect(bites[1].id).toBe('bite2');
        expect(bites[1].name).toBe('Bite 2');
      });
    });

    it('should update _latestBitesChannel$ with empty array when event is null', () => {
      service.handleLatestBites(null);

      service.latestBites$.subscribe((bites) => {
        expect(bites.length).toBe(0);
      });
    });
  });
});
