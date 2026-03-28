import { TestBed } from '@angular/core/testing';
import { BiteDataAccessService } from '../bite-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService } from 'bite-tribe/api';
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
};

const MockApiService = {
  saveNewBite: jest.fn(),
  updateImagePathInBite: jest.fn(),
};

describe('BiteDataAccessService', () => {
  let service: BiteDataAccessService;

  beforeEach(() => {
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: BiteTribeStoreService, useValue: MockStoreService },
        { provide: BiteTribeApiService, useValue: MockApiService },
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

    it('should call api.updateImagePathInBite with the image URL', async () => {
      await service.submitNewBite(bite);

      expect(MockApiService.updateImagePathInBite).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'bite123' }),
        'data:image/jpeg;base64,abc123',
      );
    });

    it('should not call api.updateImagePathInBite when there is no image', async () => {
      const biteWithoutImage = { id: 'bite123', name: 'Test Bite' } as unknown as Bite;
      await service.submitNewBite(biteWithoutImage);

      expect(MockApiService.updateImagePathInBite).not.toHaveBeenCalled();
    });

    it('should return early if saveNewBite throws', async () => {
      MockApiService.saveNewBite.mockRejectedValue(new Error('Save failed'));

      await service.submitNewBite(bite);

      expect(MockApiService.updateImagePathInBite).not.toHaveBeenCalled();
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
