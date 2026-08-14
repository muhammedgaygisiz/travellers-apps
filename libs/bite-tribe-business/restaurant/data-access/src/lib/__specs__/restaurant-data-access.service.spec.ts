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
      restaurant$: of(undefined),
      saveNewRestaurant: jest.fn(),
    } as unknown as jest.Mocked<BiteTribeStoreService>;
    apiMock = {
      getPlaceDetails: jest.fn(),
      searchPlaces: jest.fn(),
      saveRestaurantImage: jest.fn().mockResolvedValue(undefined),
      createMenuForRestaurant: jest.fn().mockResolvedValue('menu-1'),
      saveSocialMediaLinksForRestaurant: jest.fn().mockResolvedValue(undefined),
      saveDescriptionForRestaurant: jest.fn().mockResolvedValue(undefined),
      saveOpeningHoursForRestaurant: jest.fn().mockResolvedValue(undefined),
      saveAddressForRestaurant: jest.fn().mockResolvedValue(undefined),
      savePositionForRestaurant: jest.fn().mockResolvedValue(undefined),
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

  // Moved here from `bite-tribe/restaurant-data-access` in issue #1317: only
  // the business app edits a restaurant, so the consumer's library had no
  // business owning these and the business edit page was reaching across the
  // scope boundary to call them.
  describe('restaurant edits', () => {
    it('creates a menu for a restaurant through the API', async () => {
      await expect(service.createMenuForRestaurant('rest-1')).resolves.toBe(
        'menu-1',
      );

      expect(apiMock.createMenuForRestaurant).toHaveBeenCalledWith('rest-1');
    });

    it('saves social media links through the API', async () => {
      const links = [{ network: 'facebook', url: 'https://fb.com' }];

      await service.submitSocialMediaLinks('rest-1', links);

      expect(apiMock.saveSocialMediaLinksForRestaurant).toHaveBeenCalledWith(
        'rest-1',
        links,
      );
    });

    it('saves the description through the API', async () => {
      await service.submitDescription('rest-1', 'A great place');

      expect(apiMock.saveDescriptionForRestaurant).toHaveBeenCalledWith(
        'rest-1',
        'A great place',
      );
    });

    it('saves opening hours through the API', async () => {
      const openingHours = [
        {
          day: 'monday' as const,
          isOpen: true,
          timeRanges: [{ from: '09:00', to: '17:00' }],
        },
      ];

      await service.submitOpeningHours('rest-1', openingHours);

      expect(apiMock.saveOpeningHoursForRestaurant).toHaveBeenCalledWith(
        'rest-1',
        openingHours,
      );
    });

    it('saves the address through the API', async () => {
      const address = {
        street: '123 Main St',
        postcode: '12345',
        city: 'Berlin',
        country: 'Germany',
      };

      await service.submitAddress('rest-1', address);

      expect(apiMock.saveAddressForRestaurant).toHaveBeenCalledWith(
        'rest-1',
        address,
      );
    });

    it('saves the position through the API', async () => {
      const position = { latitude: 52.52, longitude: 13.405 };

      await service.submitPosition('rest-1', position);

      expect(apiMock.savePositionForRestaurant).toHaveBeenCalledWith(
        'rest-1',
        position,
      );
    });
  });

  describe('searchPlaces', () => {
    it('should search places through the API', async () => {
      const position = { latitude: 46.948, longitude: 7.4474 };
      const places = [
        {
          id: 'place-1',
          name: 'Pizza Palace',
          position,
        },
      ];
      apiMock.searchPlaces.mockResolvedValue(places);

      const result = await service.searchPlaces('Pizza', position);

      expect(apiMock.searchPlaces).toHaveBeenCalledWith('Pizza', position);
      expect(result).toBe(places);
    });
  });

  describe('getPlaceDetails', () => {
    it('should load place details through the API', async () => {
      const details = {
        name: 'Pizza Palace',
        address: {
          street: 'Main St',
          postcode: '12345',
          city: 'Bern',
          country: 'Switzerland',
        },
      };
      apiMock.getPlaceDetails.mockResolvedValue(details);

      const result = await service.getPlaceDetails('place-1');

      expect(apiMock.getPlaceDetails).toHaveBeenCalledWith('place-1');
      expect(result).toBe(details);
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
