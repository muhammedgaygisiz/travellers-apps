jest.mock('bite-tribe/store', () => ({
  BiteTribeStoreService: jest.fn(),
}));
jest.mock('bite-tribe/api', () => ({
  BiteTribeApiService: jest.fn(),
}));

import { TestBed } from '@angular/core/testing';
import { BiteTribeApiService } from 'bite-tribe/api';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { RestaurantDataAccessService } from '../restaurant-data-access.service';
import { of } from 'rxjs';

describe('RestaurantDataAccessService', () => {
  let service: RestaurantDataAccessService;
  let storeServiceMock: jest.Mocked<BiteTribeStoreService>;
  let apiMock: jest.Mocked<BiteTribeApiService>;

  beforeEach(() => {
    jest.clearAllMocks();

    storeServiceMock = {
      restaurant$: of(undefined),
    } as unknown as jest.Mocked<BiteTribeStoreService>;
    apiMock = {
      createMenuForRestaurant: jest.fn().mockResolvedValue('menu-1'),
      saveSocialMediaLinksForRestaurant: jest.fn().mockResolvedValue(undefined),
      saveDescriptionForRestaurant: jest.fn().mockResolvedValue(undefined),
      saveOpeningHoursForRestaurant: jest.fn().mockResolvedValue(undefined),
      saveAddressForRestaurant: jest.fn().mockResolvedValue(undefined),
      savePositionForRestaurant: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<BiteTribeApiService>;

    TestBed.configureTestingModule({
      providers: [
        RestaurantDataAccessService,
        { provide: BiteTribeStoreService, useValue: storeServiceMock },
        { provide: BiteTribeApiService, useValue: apiMock },
      ],
    });

    service = TestBed.inject(RestaurantDataAccessService);
  });

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
});
