import { TestBed } from '@angular/core/testing';
import { BiteDataAccessService } from '../bite-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService } from 'bite-tribe/api';
import { ToastController } from '@ionic/angular';
import { Bite } from 'model';
import { of } from 'rxjs';

jest.mock('@capacitor-firebase/firestore');

const MockStoreService = {
  biteIdFromUrl: jest.fn(() => undefined),
  currencyFromSettings$: of(undefined),
  position$: of(undefined),
  cachedBite$: of(undefined),
  nearbyRestaurants$: of(undefined),
  tagSuggestionsForEditingBite$: of(undefined),
  save: jest.fn(),
  saveNewBite: jest.fn(),
  setEditingBite: jest.fn(),
  notifyBiteSaved: jest.fn(),
  notifyUploadingImage: jest.fn(),
  notifyUploadedImage: jest.fn(),
  notifyUpdatedImagePathInBite: jest.fn(),
};

const MockApiService = {
  saveNewBite: jest.fn(),
  uploadImage: jest.fn(),
  updateImagePathInBite: jest.fn(),
};

const MockToastController = {
  create: jest.fn().mockResolvedValue({ present: jest.fn() }),
};

describe('BiteDataAccessService', () => {
  let service: BiteDataAccessService;

  beforeEach(() => {
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: BiteTribeStoreService, useValue: MockStoreService },
        { provide: BiteTribeApiService, useValue: MockApiService },
        { provide: ToastController, useValue: MockToastController },
      ],
    });

    service = TestBed.inject(BiteDataAccessService);
  });

  describe('submitNewBite', () => {
    const bite = {
      id: 'bite123',
      name: 'Test Bite',
      image: 'data:image/jpeg;base64,abc123',
    } as unknown as Bite;

    const savedBite = { id: 'bite123', name: 'Test Bite' } as unknown as Bite;
    const updatedBite = {
      id: 'bite123',
      name: 'Test Bite',
      imagePath: 'https://example.com/image.jpg',
    } as unknown as Bite;

    beforeEach(() => {
      MockApiService.saveNewBite.mockResolvedValue(savedBite);
      MockApiService.updateImagePathInBite.mockResolvedValue(updatedBite);
      MockApiService.uploadImage.mockImplementation(
        async (
          _bite: Bite,
          callbackFn: (p: any) => void,
        ): Promise<void> => {
          callbackFn({
            uploadParams: { evt: { completed: true } },
            imagePath: 'images/bites/bite123/image.jpg',
          });
        },
      );
    });

    it('should dispatch saveNewBite action immediately', async () => {
      await service.submitNewBite(bite);

      expect(MockStoreService.saveNewBite).toHaveBeenCalledWith(bite);
    });

    it('should call api.saveNewBite with bite document without image', async () => {
      await service.submitNewBite(bite);

      expect(MockApiService.saveNewBite).toHaveBeenCalledWith({
        id: 'bite123',
        name: 'Test Bite',
      });
    });

    it('should notify store that bite was saved', async () => {
      await service.submitNewBite(bite);

      expect(MockStoreService.notifyBiteSaved).toHaveBeenCalledWith({
        id: 'bite123',
        name: 'Test Bite',
        image: 'data:image/jpeg;base64,abc123',
      });
    });

    it('should call api.uploadImage', async () => {
      await service.submitNewBite(bite);

      expect(MockApiService.uploadImage).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'bite123' }),
        expect.any(Function),
      );
    });

    it('should notify store that image was uploaded', async () => {
      await service.submitNewBite(bite);

      expect(MockStoreService.notifyUploadedImage).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'bite123' }),
        'images/bites/bite123/image.jpg',
      );
    });

    it('should call api.updateImagePathInBite after upload completes', async () => {
      await service.submitNewBite(bite);

      await Promise.resolve();

      expect(MockApiService.updateImagePathInBite).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'bite123' }),
        'images/bites/bite123/image.jpg',
      );
    });

    it('should notify store of updated image path', async () => {
      await service.submitNewBite(bite);

      await Promise.resolve();

      expect(MockStoreService.notifyUpdatedImagePathInBite).toHaveBeenCalledWith(
        updatedBite,
      );
    });

    it('should notify store of upload progress when not completed', async () => {
      MockApiService.uploadImage.mockImplementation(
        async (
          _bite: Bite,
          callbackFn: (p: any) => void,
        ): Promise<void> => {
          callbackFn({
            uploadParams: { evt: { completed: false }, err: null, offlineImagePath: '' },
            imagePath: 'images/bites/bite123/image.jpg',
          });
        },
      );

      await service.submitNewBite(bite);

      expect(MockStoreService.notifyUploadingImage).toHaveBeenCalledWith(
        expect.objectContaining({ evt: { completed: false } }),
        'bite123',
        'images/bites/bite123/image.jpg',
      );
    });

    it('should show a toast when uploadImage throws', async () => {
      MockApiService.uploadImage.mockRejectedValue(
        new Error('Upload failed'),
      );

      await service.submitNewBite(bite);

      expect(MockToastController.create).toHaveBeenCalled();
    });

    it('should return early and not upload if saveNewBite throws', async () => {
      MockApiService.saveNewBite.mockRejectedValue(new Error('Save failed'));

      await service.submitNewBite(bite);

      expect(MockApiService.uploadImage).not.toHaveBeenCalled();
    });
  });

  describe('submitBite', () => {
    it('should call storeService.save with bite and docType', async () => {
      const bite = { id: '123' } as unknown as Bite;
      await service.submitBite(bite);

      expect(MockStoreService.save).toHaveBeenCalledWith(bite, 'bite');
    });
  });

  describe('setEditingBite', () => {
    it('should call storeService.setEditingBite', () => {
      const bite = { id: '123' } as unknown as Bite;
      service.setEditingBite(bite);

      expect(MockStoreService.setEditingBite).toHaveBeenCalledWith(bite);
    });
  });
});
