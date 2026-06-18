import { signal, WritableSignal } from '@angular/core';
import { Bite, Like, Restaurant } from 'model';
import { NavController } from '@ionic/angular/standalone';
import { TestBed } from '@angular/core/testing';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';
import { RestaurantDataAccessService } from 'bite-tribe/restaurant-data-access';
import { RestaurantService } from '../restaurant.service';

const mockBite: Bite = {
  id: 'bite123',
  name: 'Test Bite',
  place: 'Test place',
} as Bite;

const mockRestaurant: Restaurant = {
  id: 'restaurant123',
  name: 'Test Restaurant',
  menuId: 'empty/collections/menu456',
} as Restaurant;

interface MockRestaurantDataAccess {
  bite: WritableSignal<Bite | undefined>;
  biteIdFromUrl: WritableSignal<string | undefined>;
  bites: WritableSignal<Bite[]>;
  restaurant: WritableSignal<Restaurant | undefined>;
  submitLikeClick: jest.Mock;
}

interface MockHomeDataAccess {
  restaurantBites: WritableSignal<Bite[]>;
}

const createMockDataAccess = (
  overrides: Partial<MockRestaurantDataAccess> = {},
): MockRestaurantDataAccess => {
  const base = {
    bite: signal(mockBite),
    biteIdFromUrl: signal(mockBite.id),
    bites: signal([mockBite]),
    restaurant: signal(mockRestaurant),
    submitLikeClick: jest.fn(),
  };
  return { ...base, ...overrides };
};

const createNavControllerMock = (): Partial<NavController> => ({
  navigateForward: jest.fn().mockResolvedValue(true),
});

const createMockHomeDataAccess = (): MockHomeDataAccess => ({
  restaurantBites: signal([mockBite]),
});

describe('RestaurantService', () => {
  let service: RestaurantService;
  let mockDataAccessService: MockRestaurantDataAccess;
  let mockHomeDataAccessService: MockHomeDataAccess;
  let mockNavController: Partial<NavController>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockDataAccessService = createMockDataAccess();
    mockHomeDataAccessService = createMockHomeDataAccess();
    mockNavController = createNavControllerMock();

    TestBed.configureTestingModule({
      providers: [
        RestaurantService,
        {
          provide: RestaurantDataAccessService,
          useValue: mockDataAccessService,
        },
        {
          provide: HomeDataAccessService,
          useValue: mockHomeDataAccessService,
        },
        {
          provide: NavController,
          useValue: mockNavController,
        },
      ],
    });

    service = TestBed.inject(RestaurantService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose restaurant bites from home data access', () => {
    expect(service.bites()).toEqual([mockBite]);
  });

  describe('navigateToMenu', () => {
    it('should navigate to menu if bite and restaurant with menuId exist', () => {
      const restaurant: Restaurant = {
        id: 'restaurant123',
        name: 'Test Restaurant',
        menuId: 'empty/collections/menu456',
      } as Restaurant;
      service.navigateToMenu(restaurant);
      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        mockBite.id,
        'restaurant',
        restaurant.id,
        'menu',
        'menu456',
      ]);
    });

    it('should navigate to menu if restaurants menu id is set weirdly', () => {
      const restaurant: Restaurant = {
        id: 'restaurant123',
        name: 'Test Restaurant',
        menuId: '/menus/menu456',
      } as Restaurant;
      service.navigateToMenu(restaurant);
      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        mockBite.id,
        'restaurant',
        restaurant.id,
        'menu',
        'menu456',
      ]);
    });

    it('should use the route bite id when the bite has not loaded yet', () => {
      service.bite = signal(undefined);

      service.navigateToMenu(mockRestaurant);

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        mockBite.id,
        'restaurant',
        mockRestaurant.id,
        'menu',
        'menu456',
      ]);
    });

    it('should not navigate to a restaurant-only menu route when the bite id is unavailable', () => {
      service.bite = signal(undefined);
      mockDataAccessService.biteIdFromUrl.set(undefined);

      service.navigateToMenu(mockRestaurant);

      expect(mockNavController.navigateForward).not.toHaveBeenCalled();
    });

    it('should navigate to dynamic menu if no menuId', () => {
      const restaurant: Restaurant = {
        id: 'restaurant123',
        name: 'Test Restaurant',
      } as Restaurant;
      service.navigateToMenu(restaurant);
      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        mockBite.id,
        'restaurant',
        'Test%20place',
        'menu',
        'default',
      ]);
    });
  });

  describe('navigateToRestaurantBites', () => {
    it('should navigate to bites using restaurant id from bite path when available', () => {
      service.bite = signal({
        ...mockBite,
        restaurantId: '/restaurants/restaurant-from-bite',
      } as Bite);

      service.navigateToRestaurantBites(mockRestaurant);

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        mockBite.id,
        'restaurant',
        'restaurant-from-bite',
        'bites',
      ]);
    });

    it('should navigate to bites using restaurant id from payload when bite path is missing', () => {
      const restaurant: Restaurant = {
        id: 'restaurant123',
        name: 'Test Restaurant',
      } as Restaurant;

      service.navigateToRestaurantBites(restaurant);

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        mockBite.id,
        'restaurant',
        restaurant.id,
        'bites',
      ]);
    });

    it('should navigate to dynamic bites page if no restaurant id exists', () => {
      service.navigateToRestaurantBites(undefined);

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        mockBite.id,
        'restaurant',
        'Test%20place',
        'bites',
      ]);
    });

    it('should not navigate if no bite', () => {
      service.bite = signal(undefined);

      service.navigateToRestaurantBites(mockRestaurant);

      expect(mockNavController.navigateForward).not.toHaveBeenCalled();
    });
  });

  describe('navigateToPlaceBites', () => {
    it('should navigate to unverified bites using bite payload', () => {
      const bite: Bite = {
        id: 'bite-unverified-123',
        place: 'Unverified Place',
      } as Bite;

      service.navigateToPlaceBites(bite);

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        'bite-unverified-123',
        'restaurant',
        'Unverified%20Place',
        'bites',
      ]);
    });

    it('should not navigate for undefined bite payload', () => {
      service.navigateToPlaceBites(undefined);

      expect(mockNavController.navigateForward).not.toHaveBeenCalled();
    });
  });

  describe('biteClicked', () => {
    it('should navigate to bite details', () => {
      const bite: Bite = {
        id: 'bite123',
        name: 'Test Bite',
      } as Bite;
      service.biteClicked(bite);
      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        bite.id,
      ]);
    });
  });

  describe('likeButtonClicked', () => {
    it('should call submitLikeClick on data access service', () => {
      const likeClick: Like = {
        userId: 'user123',
        likeType: 'thumbup',
        createdAt: 'createdAt',
        biteId: 'bite123',
      };
      service.likeButtonClicked(likeClick);
      expect(mockDataAccessService.submitLikeClick).toHaveBeenCalledWith(
        likeClick,
      );
    });
  });
});
