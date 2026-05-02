import { signal } from '@angular/core';
import { Bite, Like, Restaurant } from 'model';
import { NavController, ToastController } from '@ionic/angular/standalone';
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

const createMockDataAccess = (overrides = {}): any => {
  const base = {
    bite: signal(mockBite),
    bites: signal([mockBite]),
    restaurant: signal(mockRestaurant),
    submitSocialMediaLinks: jest.fn().mockResolvedValue(undefined),
    submitLikeClick: jest.fn(),
    createMenuForRestaurant: jest.fn().mockResolvedValue('menu-id-new'),
  };
  return { ...base, ...overrides };
};

const createNavControllerMock = (): any => ({
  navigateForward: jest.fn().mockResolvedValue(true),
  navigateBack: jest.fn().mockResolvedValue(true),
  navigateRoot: jest.fn().mockResolvedValue(true),
  back: jest.fn(),
  pop: jest.fn().mockResolvedValue(true),
  getRouteId: jest.fn(),
  isTransitioning: jest.fn(),
  consumeTransition: jest.fn(),
  setDirection: jest.fn(),
  setTopOutlet: jest.fn(),
});

const createMockHomeDataAccess = (): any => ({
  restaurantBites: signal([mockBite]),
});

const createMockToastController = (): any => ({
  create: jest.fn().mockResolvedValue({
    present: jest.fn().mockResolvedValue(undefined),
  }),
});

describe('RestaurantService', () => {
  let service: RestaurantService;
  let mockDataAccessService: Partial<RestaurantDataAccessService>;
  let mockHomeDataAccessService: Partial<HomeDataAccessService>;
  let mockNavController: Partial<NavController>;
  let mockToastController: Partial<ToastController>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockDataAccessService = createMockDataAccess();
    mockHomeDataAccessService = createMockHomeDataAccess();
    mockNavController = createNavControllerMock();
    mockToastController = createMockToastController();

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
        {
          provide: ToastController,
          useValue: mockToastController,
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

  describe('createMenu', () => {
    it('should create a menu and navigate to the edit menu page', async () => {
      (
        mockDataAccessService.createMenuForRestaurant as jest.Mock
      ).mockResolvedValue('menu-new-id');

      await service.createMenu();

      expect(
        mockDataAccessService.createMenuForRestaurant,
      ).toHaveBeenCalledWith(mockRestaurant.id);
      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'restaurant',
        mockRestaurant.id,
        'menu',
        'menu-new-id',
      ]);
    });

    it('should show error toast if createMenuForRestaurant throws', async () => {
      (
        mockDataAccessService.createMenuForRestaurant as jest.Mock
      ).mockRejectedValueOnce(new Error('Network error'));

      await service.createMenu();

      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Something went wrong. Please try again.',
          color: 'danger',
          duration: 3000,
        }),
      );
    });

    it('should do nothing if restaurant is not set', async () => {
      service.restaurant = signal(undefined);

      await service.createMenu();

      expect(
        mockDataAccessService.createMenuForRestaurant,
      ).not.toHaveBeenCalled();
      expect(mockNavController.navigateForward).not.toHaveBeenCalled();
    });
  });

  describe('submitSocialMediaLinks', () => {
    it('should call submitSocialMediaLinks on data access service and show success toast', async () => {
      const links = [{ url: 'https://example.com', network: 'facebook' }];
      await service.submitSocialMediaLinks({ links });
      expect(mockDataAccessService.submitSocialMediaLinks).toHaveBeenCalledWith(
        mockRestaurant.id,
        links,
      );
      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Social media links saved successfully.',
          color: 'success',
          duration: 3000,
        }),
      );
    });

    it('should show error toast if data access throws', async () => {
      (
        mockDataAccessService.submitSocialMediaLinks as jest.Mock
      ).mockRejectedValueOnce(new Error('Network error'));
      const links = [{ url: 'https://example.com', network: 'facebook' }];
      await service.submitSocialMediaLinks({ links });
      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Something went wrong. Please try again.',
          color: 'danger',
          duration: 3000,
        }),
      );
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
