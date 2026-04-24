import { signal } from '@angular/core';
import { Bite, Like, Restaurant } from 'model';
import { NavController, ToastController } from '@ionic/angular/standalone';
import { TestBed } from '@angular/core/testing';
import { HomeDataAccessService } from 'bite-tribe/home-data-access';
import { RestaurantDataAccessService } from 'bite-tribe/restaurant-data-access';
import { RestaurantService } from '../restaurant.service';
import { TranslocoService } from '@jsverse/transloco';

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

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
};

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
        {
          provide: TranslocoService,
          useValue: MockTranslocoService,
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

  describe('navigateToBites', () => {
    it('should navigate to bites if bite and restaurant with menuId exist', () => {
      const restaurant: Restaurant = {
        id: 'restaurant123',
        name: 'Test Restaurant',
        menuId: 'empty/collections/menu456',
      } as Restaurant;
      service.navigateToBites(restaurant);
      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        mockBite.id,
        'restaurant',
        restaurant.id,
        'bites',
      ]);
    });

    it('should navigate to dynamic bites page if no menuId', () => {
      const restaurant: Restaurant = {
        id: 'restaurant123',
        name: 'Test Restaurant',
      } as Restaurant;
      service.navigateToBites(restaurant);
      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        mockBite.id,
        'restaurant',
        'Test%20place',
        'bites',
      ]);
    });

    it('should navigate to dynamic bites page if no restaurant', () => {
      service.navigateToBites(undefined as any);
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
      const restaurant: Restaurant = {
        id: 'restaurant123',
        name: 'Test Restaurant',
        menuId: 'empty/collections/menu456',
      } as Restaurant;
      service.navigateToBites(restaurant);
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

  describe('submitSocialMediaLinks', () => {
    it('should call submitSocialMediaLinks on data access service and show success toast', async () => {
      const links = [{ url: 'https://example.com', network: 'facebook' }];
      await service.submitSocialMediaLinks({ links });
      expect(mockDataAccessService.submitSocialMediaLinks).toHaveBeenCalledWith(
        mockRestaurant.id,
        links,
      );
      expect(MockTranslocoService.translate).toHaveBeenCalledWith(
        'social-media-links-saved',
      );
      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'success', duration: 3000 }),
      );
    });

    it('should show error toast if data access throws', async () => {
      (mockDataAccessService.submitSocialMediaLinks as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );
      const links = [{ url: 'https://example.com', network: 'facebook' }];
      await service.submitSocialMediaLinks({ links });
      expect(MockTranslocoService.translate).toHaveBeenCalledWith(
        'something-went-wrong-please-try-again',
      );
      expect(mockToastController.create).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'danger', duration: 3000 }),
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
