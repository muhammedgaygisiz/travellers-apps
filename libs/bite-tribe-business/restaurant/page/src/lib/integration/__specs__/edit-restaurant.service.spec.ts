import { TestBed } from '@angular/core/testing';
import { EditRestaurantService } from '../edit-restaurant.service';
import { RestaurantDataAccessService } from 'bite-tribe/restaurant-data-access';
import { NavController, ToastController } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { DaySchedule, Restaurant } from 'model';

jest.mock('bite-tribe/restaurant-data-access');
jest.mock('@capacitor-firebase/firestore');
jest.mock('@capacitor-firebase/analytics');

describe('EditRestaurantService', () => {
  let service: EditRestaurantService;
  let dataAccessMock: jest.Mocked<RestaurantDataAccessService>;
  let navControllerMock: { navigateForward: jest.Mock };
  let toastControllerMock: { create: jest.Mock };

  const mockToast = { present: jest.fn() };

  beforeEach(() => {
    dataAccessMock = {
      restaurant: signal(undefined),
      createMenuForRestaurant: jest.fn(),
      submitSocialMediaLinks: jest.fn(),
      submitDescription: jest.fn(),
      submitOpeningHours: jest.fn(),
    } as unknown as jest.Mocked<RestaurantDataAccessService>;

    navControllerMock = { navigateForward: jest.fn() };
    toastControllerMock = { create: jest.fn().mockResolvedValue(mockToast) };

    TestBed.configureTestingModule({
      providers: [
        EditRestaurantService,
        { provide: RestaurantDataAccessService, useValue: dataAccessMock },
        { provide: NavController, useValue: navControllerMock },
        { provide: ToastController, useValue: toastControllerMock },
      ],
    });

    service = TestBed.inject(EditRestaurantService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('gotoEditMenu', () => {
    it('should navigate when menuId is provided', () => {
      service.gotoEditMenu('rest1', 'menu1');
      expect(navControllerMock.navigateForward).toHaveBeenCalledWith([
        'restaurant', 'rest1', 'menu', 'menu1',
      ]);
    });

    it('should not navigate when menuId is undefined', () => {
      service.gotoEditMenu('rest1', undefined);
      expect(navControllerMock.navigateForward).not.toHaveBeenCalled();
    });
  });

  describe('createMenu', () => {
    it('should do nothing when restaurant is undefined', async () => {
      await service.createMenu();
      expect(dataAccessMock.createMenuForRestaurant).not.toHaveBeenCalled();
    });

    it('should create menu and navigate on success', async () => {
      const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (dataAccessMock.createMenuForRestaurant as jest.Mock).mockResolvedValue('menu1');

      await service.createMenu();

      expect(dataAccessMock.createMenuForRestaurant).toHaveBeenCalledWith('rest1');
      expect(navControllerMock.navigateForward).toHaveBeenCalled();
    });

    it('should show danger toast on error', async () => {
      const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (dataAccessMock.createMenuForRestaurant as jest.Mock).mockRejectedValue(new Error('fail'));

      await service.createMenu();

      expect(toastControllerMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'danger' }),
      );
    });
  });

  describe('submitSocialMediaLinks', () => {
    it('should do nothing when restaurant is undefined', async () => {
      await service.submitSocialMediaLinks({ links: [] });
      expect(dataAccessMock.submitSocialMediaLinks).not.toHaveBeenCalled();
    });

    it('should save links and show success toast', async () => {
      const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (dataAccessMock.submitSocialMediaLinks as jest.Mock).mockResolvedValue(undefined);

      await service.submitSocialMediaLinks({ links: [{ network: 'facebook', url: 'https://fb.com' }] });

      expect(dataAccessMock.submitSocialMediaLinks).toHaveBeenCalledWith('rest1', [
        { network: 'facebook', url: 'https://fb.com' },
      ]);
      expect(toastControllerMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'success' }),
      );
    });

    it('should show danger toast on error', async () => {
      const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (dataAccessMock.submitSocialMediaLinks as jest.Mock).mockRejectedValue(new Error('fail'));

      await service.submitSocialMediaLinks({ links: [{ network: 'facebook', url: 'https://fb.com' }] });

      expect(toastControllerMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'danger' }),
      );
    });
  });

  describe('submitDescription', () => {
    it('should do nothing when restaurant is undefined', async () => {
      await service.submitDescription('A great place');
      expect(dataAccessMock.submitDescription).not.toHaveBeenCalled();
    });

    it('should save description and show success toast', async () => {
      const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (dataAccessMock.submitDescription as jest.Mock).mockResolvedValue(undefined);

      await service.submitDescription('A great place');

      expect(dataAccessMock.submitDescription).toHaveBeenCalledWith(
        'rest1',
        'A great place',
      );
      expect(toastControllerMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'success' }),
      );
    });

    it('should show danger toast on error', async () => {
      const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (dataAccessMock.submitDescription as jest.Mock).mockRejectedValue(new Error('fail'));

      await service.submitDescription('A great place');

      expect(toastControllerMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'danger' }),
      );
    });
  });

  describe('submitOpeningHours', () => {
    it('should do nothing when restaurant is undefined', async () => {
      await service.submitOpeningHours([]);
      expect(dataAccessMock.submitOpeningHours).not.toHaveBeenCalled();
    });

    it('should save opening hours and show success toast', async () => {
      const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (dataAccessMock.submitOpeningHours as jest.Mock).mockResolvedValue(undefined);

      await service.submitOpeningHours([
        { day: 'monday', isOpen: true, timeRanges: [{ from: '09:00', to: '17:00' }] },
      ]);

      expect(dataAccessMock.submitOpeningHours).toHaveBeenCalledWith('rest1', [
        { day: 'monday', isOpen: true, timeRanges: [{ from: '09:00', to: '17:00' }] },
      ]);
      expect(toastControllerMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'success' }),
      );
    });

    it('should show danger toast on error', async () => {
      const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (dataAccessMock.submitOpeningHours as jest.Mock).mockRejectedValue(new Error('fail'));

      await service.submitOpeningHours([]);

      expect(toastControllerMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'danger' }),
      );
    });
  });
});
