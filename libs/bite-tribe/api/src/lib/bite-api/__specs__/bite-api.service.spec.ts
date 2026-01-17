import { BiteApiService } from '../bite-api.service';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { of } from 'rxjs';
import { loadBitesByLocation } from '../utils/load-bites-by-location';
import { loadBitesByUser } from '../utils/load-bites-by-user';
import { createBite } from '../utils/create-bite';
import { uploadImageAndUpdateBite } from '../utils/upload-image-and-update-bite';
import { loadBiteById } from '../utils/load-bite-by-id';
import { Bite, Bucketlist } from 'model';
import { saveEditedBite } from '../utils/save-edited-bite';
import { deleteFileInFirebaseStorage } from '../utils/delete-file-in-firebasestorage';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { ErrorHandler } from '@angular/core';
import { loadBitesByBucketlist } from '../utils/load-bites-by-bucketlist';

jest.mock('../utils/load-bites-by-location', () => ({
  loadBitesByLocation: jest.fn(),
}));

jest.mock('../utils/load-bites-by-user', () => ({
  loadBitesByUser: jest.fn(),
}));

const mockedBiteId = 'mocked-bite-id';
jest.mock('../utils/create-bite', () => {
  return {
    createBite: jest.fn(() => ({ id: mockedBiteId })),
  };
});

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

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    deleteDocument: jest.fn(),
  },
}));

jest.mock('../utils/load-bites-by-bucketlist', () => ({
  loadBitesByBucketlist: jest.fn(),
}));

const mockedUser = { uid: '123' };
const MockedAuthService = {
  authState: (): any => ({ user: mockedUser }),
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
      await service.loadBitesByUser({ uid: '123' });

      expect(loadBitesByUser).toHaveBeenCalledWith({ uid: '123' });
    });
  });

  describe('saveNewBite', () => {
    it('should extract base64 image, save the bite, upload the image and update the bite with the image path', async () => {
      const mockedBiteWithoutImage = { id: 'bite123', title: 'Test Bite' };
      const mockedBase64Image =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
      const mockedBite = {
        image: mockedBase64Image,
        ...mockedBiteWithoutImage,
      } as unknown as Bite;

      await service.saveNewBite(mockedBite);

      expect(createBite).toHaveBeenCalledWith(
        mockedBiteWithoutImage,
        mockedUser,
      );
      expect(uploadImageAndUpdateBite).toHaveBeenCalledWith(
        true,
        mockedBase64Image,
        { id: mockedBiteId },
      );
      expect(loadBiteById).toHaveBeenCalledWith({ id: mockedBiteId });
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
  });

  describe('loadBitesByBucketlist', () => {
    it('should call loadBitesByBucketlist with the bucketlist', async () => {
      const mockedBucketlist = { id: 'bucketlist-123' } as Bucketlist;
      await service.loadBitesByBucketlist(mockedBucketlist);

      expect(loadBitesByBucketlist).toHaveBeenCalledWith(mockedBucketlist);
    });
  });
});
