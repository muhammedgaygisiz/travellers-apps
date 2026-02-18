import { saveEditedBite } from '../save-edited-bite';
import {
  FirebaseFirestore,
  GetDocumentResult,
  DocumentData,
} from '@capacitor-firebase/firestore';
import { replaceImageInFirestoreStorage } from '../replace-image-in-firestorestorage';
import { uploadImageAndUpdateBite } from '../upload-image-and-update-bite';
import { Bite } from 'model';

jest.mock('@capacitor-firebase/firestore');

jest.mock('../replace-image-in-firestorestorage', () => ({
  replaceImageInFirestoreStorage: jest.fn(),
}));

jest.mock('../upload-image-and-update-bite', () => ({
  uploadImageAndUpdateBite: jest.fn(),
}));

jest.mock('../../../utils/to-bite', () => ({
  toBite: jest.fn((doc) => ({
    id: doc.id,
    imagePath: doc.data?.imagePath,
    ...doc.data,
  })),
}));

describe('saveEditedBite', () => {
  let updateDocumentSpy: jest.SpyInstance;
  let getDocumentSpy: jest.SpyInstance;
  let replaceImageSpy: jest.Mock;
  let uploadImageSpy: jest.Mock;
  let dateNowSpy: jest.SpyInstance;

  const MOCK_TIMESTAMP = 1736510400000; // 2026-01-10T12:00:00.000Z
  const MOCK_DATE_STRING = '2026-01-10T12:00:00.000Z';

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(MOCK_DATE_STRING));

    // Mock Date.now() explicitly
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(MOCK_TIMESTAMP);

    updateDocumentSpy = jest
      .spyOn(FirebaseFirestore, 'updateDocument')
      .mockResolvedValue(undefined);

    getDocumentSpy = jest
      .spyOn(FirebaseFirestore, 'getDocument')
      .mockResolvedValue({
        snapshot: { id: 'bite1', data: {}, path: 'bites/bite1', metadata: {} },
      } as GetDocumentResult<DocumentData>);

    replaceImageSpy = replaceImageInFirestoreStorage as jest.Mock;
    uploadImageSpy = uploadImageAndUpdateBite as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    dateNowSpy.mockRestore();
  });

  describe('when bite has imagePath and image (replacing existing image)', () => {
    const bite: Bite = {
      id: 'bite1',
      name: 'Pizza',
      image: 'data:image/jpeg;base64,/9j/4AAQ...',
      imagePath: 'bites/bite1/image.jpg',
      place: 'Restaurant A',
      price: 15.99,
      position: { latitude: 40.7128, longitude: -74.006 },
    };

    it('should call replaceImageInFirestoreStorage for web', async () => {
      await saveEditedBite(true, bite);

      expect(replaceImageSpy).toHaveBeenCalledWith(
        'data:image/jpeg;base64,/9j/4AAQ...',
        'bites/bite1/image.jpg',
        'bite1',
        {
          id: 'bite1',
          name: 'Pizza',
          imagePath: 'bites/bite1/image.jpg',
          place: 'Restaurant A',
          price: 15.99,
          position: { latitude: 40.7128, longitude: -74.006 },
        },
      );
      expect(updateDocumentSpy).not.toHaveBeenCalled();
    });

    it('should call replaceImageInFirestoreStorage for mobile', async () => {
      await saveEditedBite(false, bite);

      expect(replaceImageSpy).toHaveBeenCalledWith(
        'data:image/jpeg;base64,/9j/4AAQ...',
        'bites/bite1/image.jpg',
        'bite1',
        {
          id: 'bite1',
          name: 'Pizza',
          imagePath: 'bites/bite1/image.jpg',
          place: 'Restaurant A',
          price: 15.99,
          position: { latitude: 40.7128, longitude: -74.006 },
        },
      );
      expect(updateDocumentSpy).not.toHaveBeenCalled();
    });
  });

  describe('when bite has imagePath but no image (updating metadata only)', () => {
    const bite: Bite = {
      id: 'bite2',
      name: 'Burger',
      image: '',
      imagePath: 'bites/bite2/image.jpg',
      place: 'Restaurant B',
      price: 12.5,
      currency: 'USD',
      position: { latitude: 40.7129, longitude: -74.007 },
      tags: ['burger', 'fast-food'],
    };

    it('should update document without image for web', async () => {
      await saveEditedBite(true, bite);

      expect(updateDocumentSpy).toHaveBeenCalledWith({
        reference: 'bites/bite2',
        data: {
          id: 'bite2',
          name: 'Burger',
          imagePath: 'bites/bite2/image.jpg',
          place: 'Restaurant B',
          price: 12.5,
          currency: 'USD',
          position: { latitude: 40.7129, longitude: -74.007 },
          tags: ['burger', 'fast-food'],
          updatedAt: MOCK_DATE_STRING,
          updatedAtTimestamp: MOCK_TIMESTAMP,
        },
      });
      expect(replaceImageSpy).not.toHaveBeenCalled();
      expect(uploadImageSpy).not.toHaveBeenCalled();
    });

    it('should update document without image for mobile', async () => {
      await saveEditedBite(false, bite);

      expect(updateDocumentSpy).toHaveBeenCalledWith({
        reference: 'bites/bite2',
        data: {
          id: 'bite2',
          name: 'Burger',
          imagePath: 'bites/bite2/image.jpg',
          place: 'Restaurant B',
          price: 12.5,
          currency: 'USD',
          position: { latitude: 40.7129, longitude: -74.007 },
          tags: ['burger', 'fast-food'],
          updatedAt: MOCK_DATE_STRING,
          updatedAtTimestamp: MOCK_TIMESTAMP,
        },
      });
      expect(replaceImageSpy).not.toHaveBeenCalled();
      expect(uploadImageSpy).not.toHaveBeenCalled();
    });
  });

  describe('when bite has no imagePath but has image', () => {
    describe('and original bite has imagePath (replace old image)', () => {
      beforeEach(() => {
        getDocumentSpy.mockResolvedValue({
          snapshot: {
            id: 'bite3',
            path: 'bites/bite3',
            metadata: {},
            data: {
              imagePath: 'bites/bite3/old-image.jpg',
            },
          },
        } as unknown as GetDocumentResult<DocumentData>);
      });

      const bite: Bite = {
        id: 'bite3',
        name: 'Sushi',
        image: 'data:image/jpeg;base64,newImage123',
        place: 'Restaurant C',
        price: 25.0,
        position: { latitude: 40.713, longitude: -74.008 },
      };

      it('should fetch original bite and replace image for web', async () => {
        await saveEditedBite(true, bite);

        expect(getDocumentSpy).toHaveBeenCalledWith({
          reference: 'bites/bite3',
        });
        expect(replaceImageSpy).toHaveBeenCalledWith(
          'data:image/jpeg;base64,newImage123',
          'bites/bite3/old-image.jpg',
          'bite3',
          {
            id: 'bite3',
            name: 'Sushi',
            place: 'Restaurant C',
            price: 25.0,
            position: { latitude: 40.713, longitude: -74.008 },
          },
        );
        expect(uploadImageSpy).not.toHaveBeenCalled();
      });

      it('should fetch original bite and replace image for mobile', async () => {
        await saveEditedBite(false, bite);

        expect(getDocumentSpy).toHaveBeenCalledWith({
          reference: 'bites/bite3',
        });
        expect(replaceImageSpy).toHaveBeenCalledWith(
          'data:image/jpeg;base64,newImage123',
          'bites/bite3/old-image.jpg',
          'bite3',
          {
            id: 'bite3',
            name: 'Sushi',
            place: 'Restaurant C',
            price: 25.0,
            position: { latitude: 40.713, longitude: -74.008 },
          },
        );
        expect(uploadImageSpy).not.toHaveBeenCalled();
      });
    });

    describe('and original bite has no imagePath (old style bite with base64)', () => {
      beforeEach(() => {
        getDocumentSpy.mockResolvedValue({
          snapshot: {
            id: 'bite4',
            path: 'bites/bite4',
            metadata: {},
            data: {
              name: 'Pasta',
              image: 'data:image/jpeg;base64,oldImage',
            },
          },
        } as unknown as GetDocumentResult<DocumentData>);
      });

      const bite: Bite = {
        id: 'bite4',
        name: 'Pasta',
        image: 'data:image/jpeg;base64,newImage456',
        place: 'Restaurant D',
        price: 18.0,
        position: { latitude: 40.7131, longitude: -74.009 },
      };

      it('should upload new image and update bite for web', async () => {
        await saveEditedBite(true, bite);

        expect(getDocumentSpy).toHaveBeenCalledWith({
          reference: 'bites/bite4',
        });
        expect(uploadImageSpy).toHaveBeenCalledWith({
          imageBase64: 'data:image/jpeg;base64,newImage456',
          biteId: 'bite4',
          biteWithoutImage: {
            id: 'bite4',
            name: 'Pasta',
            place: 'Restaurant D',
            price: 18.0,
            position: { latitude: 40.7131, longitude: -74.009 },
          },
          clearBase64Image: true,
        });
        expect(replaceImageSpy).not.toHaveBeenCalled();
      });

      it('should upload new image and update bite for mobile', async () => {
        await saveEditedBite(false, bite);

        expect(getDocumentSpy).toHaveBeenCalledWith({
          reference: 'bites/bite4',
        });
        expect(uploadImageSpy).toHaveBeenCalledWith({
          imageBase64: 'data:image/jpeg;base64,newImage456',
          biteId: 'bite4',
          biteWithoutImage: {
            id: 'bite4',
            name: 'Pasta',
            place: 'Restaurant D',
            price: 18.0,
            position: { latitude: 40.7131, longitude: -74.009 },
          },
          clearBase64Image: true,
        });
        expect(replaceImageSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('when bite has no imagePath and no image (metadata update only)', () => {
    const bite: Bite = {
      id: 'bite5',
      name: 'Salad',
      image: '',
      place: 'Restaurant E',
      price: 10.0,
      position: { latitude: 40.7132, longitude: -74.01 },
      rating: 4.5,
      description: 'Fresh garden salad',
    };

    it('should update document with all bite data for web', async () => {
      await saveEditedBite(true, bite);

      expect(updateDocumentSpy).toHaveBeenCalledWith({
        reference: 'bites/bite5',
        data: {
          id: 'bite5',
          name: 'Salad',
          image: '',
          place: 'Restaurant E',
          price: 10.0,
          position: { latitude: 40.7132, longitude: -74.01 },
          rating: 4.5,
          description: 'Fresh garden salad',
          updatedAt: MOCK_DATE_STRING,
          updatedAtTimestamp: MOCK_TIMESTAMP,
        },
      });
      expect(getDocumentSpy).not.toHaveBeenCalled();
      expect(replaceImageSpy).not.toHaveBeenCalled();
      expect(uploadImageSpy).not.toHaveBeenCalled();
    });

    it('should update document with all bite data for mobile', async () => {
      await saveEditedBite(false, bite);

      expect(updateDocumentSpy).toHaveBeenCalledWith({
        reference: 'bites/bite5',
        data: {
          id: 'bite5',
          name: 'Salad',
          image: '',
          place: 'Restaurant E',
          price: 10.0,
          position: { latitude: 40.7132, longitude: -74.01 },
          rating: 4.5,
          description: 'Fresh garden salad',
          updatedAt: MOCK_DATE_STRING,
          updatedAtTimestamp: MOCK_TIMESTAMP,
        },
      });
      expect(getDocumentSpy).not.toHaveBeenCalled();
      expect(replaceImageSpy).not.toHaveBeenCalled();
      expect(uploadImageSpy).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle bite with all optional fields', async () => {
      const biteWithAllFields: Bite = {
        id: 'bite6',
        userId: 'user123',
        name: 'Complete Bite',
        image: '',
        imagePath: 'bites/bite6/image.jpg',
        place: 'Restaurant F',
        price: 30.0,
        currency: 'EUR',
        position: { latitude: 40.7133, longitude: -74.011 },
        geohash: 'dr5ru',
        restaurantId: 'rest123',
        tags: ['fine-dining', 'seafood'],
        rating: 5.0,
        description: 'Amazing seafood',
        createdAt: '2026-01-09T10:00:00.000Z',
        createdAtTimestamp: 1736416800000,
      };

      await saveEditedBite(true, biteWithAllFields);

      expect(updateDocumentSpy).toHaveBeenCalledWith({
        reference: 'bites/bite6',
        data: {
          id: 'bite6',
          userId: 'user123',
          name: 'Complete Bite',
          imagePath: 'bites/bite6/image.jpg',
          place: 'Restaurant F',
          price: 30.0,
          currency: 'EUR',
          position: { latitude: 40.7133, longitude: -74.011 },
          geohash: 'dr5ru',
          restaurantId: 'rest123',
          tags: ['fine-dining', 'seafood'],
          rating: 5.0,
          description: 'Amazing seafood',
          createdAt: '2026-01-09T10:00:00.000Z',
          createdAtTimestamp: 1736416800000,
          updatedAt: MOCK_DATE_STRING,
          updatedAtTimestamp: MOCK_TIMESTAMP,
        },
      });
    });

    it('should handle bite with empty strings for optional fields', async () => {
      const bite: Bite = {
        id: 'bite7',
        name: 'Minimal Bite',
        image: '',
        place: '',
        price: 0,
        position: { latitude: 0, longitude: 0 },
      };

      await saveEditedBite(false, bite);

      expect(updateDocumentSpy).toHaveBeenCalledWith({
        reference: 'bites/bite7',
        data: {
          id: 'bite7',
          name: 'Minimal Bite',
          image: '',
          place: '',
          price: 0,
          position: { latitude: 0, longitude: 0 },
          updatedAt: MOCK_DATE_STRING,
          updatedAtTimestamp: MOCK_TIMESTAMP,
        },
      });
    });

    it('should properly exclude image property when bite has imagePath and empty image', async () => {
      const bite: Bite = {
        id: 'bite8',
        name: 'Test Bite',
        image: '',
        imagePath: 'bites/bite8/image.jpg',
        place: 'Test Place',
        price: 5.0,
        position: { latitude: 40.7134, longitude: -74.012 },
      };

      await saveEditedBite(true, bite);

      expect(updateDocumentSpy).toHaveBeenCalledWith({
        reference: 'bites/bite8',
        data: {
          id: 'bite8',
          name: 'Test Bite',
          imagePath: 'bites/bite8/image.jpg',
          place: 'Test Place',
          price: 5.0,
          position: { latitude: 40.7134, longitude: -74.012 },
          updatedAt: MOCK_DATE_STRING,
          updatedAtTimestamp: MOCK_TIMESTAMP,
        },
      });
      expect(updateDocumentSpy.mock.calls[0][0].data).not.toHaveProperty(
        'image',
      );
    });
  });
});
