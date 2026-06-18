import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavController, ToastController } from '@ionic/angular/standalone';
import { RestaurantDataAccessService } from 'bite-tribe/restaurant-data-access';
import { Bite, Restaurant } from 'model';
import { EditRestaurantService } from '../edit-restaurant.service';

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
  restaurant: WritableSignal<Restaurant | undefined>;
  submitSocialMediaLinks: jest.Mock;
  createMenuForRestaurant: jest.Mock;
}

const createMockDataAccess = (
  overrides: Partial<MockRestaurantDataAccess> = {},
): MockRestaurantDataAccess => {
  const base = {
    bite: signal(mockBite),
    biteIdFromUrl: signal(mockBite.id),
    restaurant: signal(mockRestaurant),
    submitSocialMediaLinks: jest.fn().mockResolvedValue(undefined),
    createMenuForRestaurant: jest.fn().mockResolvedValue('menu-id-new'),
  };
  return { ...base, ...overrides };
};

const createNavControllerMock = (): Partial<NavController> => ({
  navigateForward: jest.fn().mockResolvedValue(true),
});

const createMockToastController = (): Partial<ToastController> => ({
  create: jest.fn().mockResolvedValue({
    present: jest.fn().mockResolvedValue(undefined),
  }),
});

describe(EditRestaurantService.name, () => {
  let service: EditRestaurantService;
  let mockDataAccessService: MockRestaurantDataAccess;
  let mockNavController: Partial<NavController>;
  let mockToastController: Partial<ToastController>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockDataAccessService = createMockDataAccess();
    mockNavController = createNavControllerMock();
    mockToastController = createMockToastController();

    TestBed.configureTestingModule({
      providers: [
        EditRestaurantService,
        {
          provide: RestaurantDataAccessService,
          useValue: mockDataAccessService,
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

    service = TestBed.inject(EditRestaurantService);
  });

  it('should expose the restaurant from data access', () => {
    expect(service.restaurant()).toEqual(mockRestaurant);
  });

  describe('gotoEditMenu', () => {
    it('should navigate to the Bite Tribe menu route', () => {
      service.gotoEditMenu(mockRestaurant.id, '/menus/menu456');

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        mockBite.id,
        'restaurant',
        mockRestaurant.id,
        'menu',
        'menu456',
      ]);
    });

    it('should use the route bite id when the bite has not loaded yet', () => {
      mockDataAccessService.bite.set(undefined);

      service.gotoEditMenu(mockRestaurant.id, 'menu456');

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        mockBite.id,
        'restaurant',
        mockRestaurant.id,
        'menu',
        'menu456',
      ]);
    });

    it('should not navigate if the bite id is unavailable', () => {
      mockDataAccessService.bite.set(undefined);
      mockDataAccessService.biteIdFromUrl.set(undefined);

      service.gotoEditMenu(mockRestaurant.id, 'menu456');

      expect(mockNavController.navigateForward).not.toHaveBeenCalled();
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
        'bite',
        mockBite.id,
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
      mockDataAccessService.restaurant.set(undefined);

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
});
