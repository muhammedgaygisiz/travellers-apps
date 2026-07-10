jest.mock('bite-tribe/store', () => ({
  BiteTribeStoreService: jest.fn(),
}));
jest.mock('bite-tribe/api', () => ({
  BiteTribeApiService: jest.fn(),
}));

import { TestBed } from '@angular/core/testing';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { BiteTribeApiService } from 'bite-tribe/api';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { Restaurant } from 'model';
import { RestaurantDataAccessService } from '../restaurant-data-access.service';
import { of } from 'rxjs';

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: {
    callByName: jest.fn(),
  },
}));

describe('RestaurantDataAccessService', () => {
  let service: RestaurantDataAccessService;
  let storeServiceMock: jest.Mocked<BiteTribeStoreService>;
  let apiMock: jest.Mocked<BiteTribeApiService>;

  beforeEach(() => {
    jest.clearAllMocks();

    storeServiceMock = {
      restaurantToCreate$: of(undefined),
      saveNewRestaurant: jest.fn(),
    } as unknown as jest.Mocked<BiteTribeStoreService>;
    apiMock = {
      saveRestaurantImage: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<BiteTribeApiService>;

    jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
      data: {
        restaurantId: 'restaurant-1',
        menuId: 'menu-1',
        candidateId: 'candidate-1',
        status: 'created',
      },
    });

    TestBed.configureTestingModule({
      providers: [
        RestaurantDataAccessService,
        { provide: BiteTribeStoreService, useValue: storeServiceMock },
        { provide: BiteTribeApiService, useValue: apiMock },
      ],
    });

    service = TestBed.inject(RestaurantDataAccessService);
  });

  describe('submitNewRestaurant', () => {
    it('should save a normal restaurant through the store', () => {
      const restaurant = { id: '', name: 'Pizza Palace' } as Restaurant;

      service.submitNewRestaurant(restaurant);

      expect(storeServiceMock.saveNewRestaurant).toHaveBeenCalledWith(
        restaurant,
      );
    });
  });

  describe('verifyRestaurantCandidate', () => {
    it('should call the verification callable with sanitized restaurant data', async () => {
      const restaurant = {
        id: '',
        name: 'Pizza Palace',
        image: 'data:image/png;base64,abc',
        position: { latitude: 46.948, longitude: 7.4474 },
        restaurantCandidateId: 'candidate-1',
        biteIds: ['bite-1'],
        bites: [{ id: 'bite-1' }],
        unsaved: true,
      } as Restaurant;

      const result = await service.verifyRestaurantCandidate(restaurant);

      expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
        name: 'verifyRestaurantCandidate',
        data: {
          candidateId: 'candidate-1',
          restaurant: {
            name: 'Pizza Palace',
            image: 'data:image/png;base64,abc',
            position: { latitude: 46.948, longitude: 7.4474 },
          },
        },
      });
      expect(result).toEqual({
        restaurantId: 'restaurant-1',
        menuId: 'menu-1',
        candidateId: 'candidate-1',
        status: 'created',
      });
      expect(apiMock.saveRestaurantImage).toHaveBeenCalledWith(
        'restaurant-1',
        'data:image/png;base64,abc',
      );
    });

    it('should not upload the image again for already verified candidates', async () => {
      jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
        data: {
          restaurantId: 'restaurant-1',
          candidateId: 'candidate-1',
          status: 'already-verified',
        },
      });

      await service.verifyRestaurantCandidate({
        id: '',
        name: 'Pizza Palace',
        image: 'data:image/png;base64,abc',
        restaurantCandidateId: 'candidate-1',
      } as Restaurant);

      expect(apiMock.saveRestaurantImage).not.toHaveBeenCalled();
    });

    it('should require a candidate id', async () => {
      await expect(
        service.verifyRestaurantCandidate({
          id: '',
          name: 'Pizza Palace',
        } as Restaurant),
      ).rejects.toThrow('restaurantCandidateId is required');

      expect(FirebaseFunctions.callByName).not.toHaveBeenCalled();
    });
  });
});
