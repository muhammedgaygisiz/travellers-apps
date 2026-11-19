import { TestBed } from '@angular/core/testing';
import { EditRestaurantService } from '../edit-restaurant.service';
import {
  RestaurantDataAccessService,
  RestaurantImageUploadService,
} from 'bite-tribe-business/restaurant-data-access';
import { NavController } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { Address, Geopoint, Restaurant } from 'model';
import { ToastService } from 'toast';

jest.mock('bite-tribe-business/restaurant-data-access');
jest.mock('@capacitor-firebase/firestore');
jest.mock('@capacitor-firebase/analytics');

describe('EditRestaurantService', () => {
  let service: EditRestaurantService;
  let dataAccessMock: jest.Mocked<RestaurantDataAccessService>;
  let navControllerMock: { navigateForward: jest.Mock };
  let toastMock: { present: jest.Mock };
  let photoUploadMock: {
    upload: ReturnType<typeof signal>;
    statusFor: jest.Mock;
    start: jest.Mock;
    retry: jest.Mock;
  };

  beforeEach(() => {
    dataAccessMock = {
      restaurant: signal(undefined),
      createMenuForRestaurant: jest.fn(),
      submitSocialMediaLinks: jest.fn(),
      submitDescription: jest.fn(),
      submitOpeningHours: jest.fn(),
      submitGenderNeutralRestroom: jest.fn(),
      submitCategories: jest.fn(),
      submitAddress: jest.fn(),
      submitPosition: jest.fn(),
    } as unknown as jest.Mocked<RestaurantDataAccessService>;

    navControllerMock = { navigateForward: jest.fn() };
    toastMock = { present: jest.fn().mockResolvedValue(undefined) };
    photoUploadMock = {
      upload: signal(undefined),
      statusFor: jest.fn().mockReturnValue(undefined),
      start: jest.fn(),
      retry: jest.fn().mockReturnValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        EditRestaurantService,
        { provide: RestaurantDataAccessService, useValue: dataAccessMock },
        { provide: NavController, useValue: navControllerMock },
        { provide: ToastService, useValue: toastMock },
        { provide: RestaurantImageUploadService, useValue: photoUploadMock },
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
        'restaurant',
        'rest1',
        'menu',
        'menu1',
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
      (dataAccessMock.createMenuForRestaurant as jest.Mock).mockResolvedValue(
        'menu1',
      );

      await service.createMenu();

      expect(dataAccessMock.createMenuForRestaurant).toHaveBeenCalledWith(
        'rest1',
      );
      expect(navControllerMock.navigateForward).toHaveBeenCalled();
    });

    it('should show danger toast on error', async () => {
      const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (dataAccessMock.createMenuForRestaurant as jest.Mock).mockRejectedValue(
        new Error('fail'),
      );

      await service.createMenu();

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });
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
      (dataAccessMock.submitSocialMediaLinks as jest.Mock).mockResolvedValue(
        undefined,
      );

      await service.submitSocialMediaLinks({
        links: [{ network: 'facebook', url: 'https://fb.com' }],
      });

      expect(dataAccessMock.submitSocialMediaLinks).toHaveBeenCalledWith(
        'rest1',
        [{ network: 'facebook', url: 'https://fb.com' }],
      );
      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'social-media-links-saved',
        outcome: 'success',
      });
    });

    it('should show danger toast on error', async () => {
      const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (dataAccessMock.submitSocialMediaLinks as jest.Mock).mockRejectedValue(
        new Error('fail'),
      );

      await service.submitSocialMediaLinks({
        links: [{ network: 'facebook', url: 'https://fb.com' }],
      });

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });
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
      (dataAccessMock.submitDescription as jest.Mock).mockResolvedValue(
        undefined,
      );

      await service.submitDescription('A great place');

      expect(dataAccessMock.submitDescription).toHaveBeenCalledWith(
        'rest1',
        'A great place',
      );
      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'about-restaurant-saved',
        outcome: 'success',
      });
    });

    it('should show danger toast on error', async () => {
      const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (dataAccessMock.submitDescription as jest.Mock).mockRejectedValue(
        new Error('fail'),
      );

      await service.submitDescription('A great place');

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });
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
      (dataAccessMock.submitOpeningHours as jest.Mock).mockResolvedValue(
        undefined,
      );

      await service.submitOpeningHours([
        {
          day: 'monday',
          isOpen: true,
          timeRanges: [{ from: '09:00', to: '17:00' }],
        },
      ]);

      expect(dataAccessMock.submitOpeningHours).toHaveBeenCalledWith('rest1', [
        {
          day: 'monday',
          isOpen: true,
          timeRanges: [{ from: '09:00', to: '17:00' }],
        },
      ]);
      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'opening-hours-saved',
        outcome: 'success',
      });
    });

    it('should show danger toast on error', async () => {
      const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (dataAccessMock.submitOpeningHours as jest.Mock).mockRejectedValue(
        new Error('fail'),
      );

      await service.submitOpeningHours([]);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });
    });
  });

  describe('submitGenderNeutralRestroom', () => {
    it('does nothing without a restaurant', async () => {
      await service.submitGenderNeutralRestroom(true);
      expect(dataAccessMock.submitGenderNeutralRestroom).not.toHaveBeenCalled();
    });

    it.each([true, false, undefined])(
      'saves %s and confirms it',
      async (genderNeutralRestroom) => {
        const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
        (dataAccessMock.restaurant as ReturnType<typeof signal>).set(
          restaurant,
        );

        await service.submitGenderNeutralRestroom(genderNeutralRestroom);

        expect(dataAccessMock.submitGenderNeutralRestroom).toHaveBeenCalledWith(
          'rest1',
          genderNeutralRestroom,
        );
        expect(toastMock.present).toHaveBeenCalledWith({
          messageKey: 'facilities-saved',
          outcome: 'success',
        });
      },
    );

    it('says so when the save fails', async () => {
      const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (
        dataAccessMock.submitGenderNeutralRestroom as jest.Mock
      ).mockRejectedValue(new Error('fail'));

      await service.submitGenderNeutralRestroom(true);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });
    });
  });

  /** See GitHub issue #2131. */
  describe('submitCategories', () => {
    it('does nothing without a restaurant', async () => {
      await service.submitCategories(['cafe']);
      expect(dataAccessMock.submitCategories).not.toHaveBeenCalled();
    });

    it('saves the categories and confirms it', async () => {
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set({
        id: 'rest1',
        name: 'Test',
      } as Restaurant);

      await service.submitCategories(['cafe', 'bakery']);

      expect(dataAccessMock.submitCategories).toHaveBeenCalledWith('rest1', [
        'cafe',
        'bakery',
      ]);
      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'categories-saved',
        outcome: 'success',
      });
    });

    it('says so when the save fails', async () => {
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set({
        id: 'rest1',
        name: 'Test',
      } as Restaurant);
      (dataAccessMock.submitCategories as jest.Mock).mockRejectedValue(
        new Error('fail'),
      );

      await service.submitCategories(['cafe']);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });
    });
  });

  describe('submitAddress', () => {
    const address: Address = {
      street: '123 Main St',
      postcode: '12345',
      city: 'Berlin',
      country: 'Germany',
    };

    it('should do nothing when restaurant is undefined', async () => {
      await service.submitAddress(address);
      expect(dataAccessMock.submitAddress).not.toHaveBeenCalled();
    });

    it('should save address and show success toast', async () => {
      const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (dataAccessMock.submitAddress as jest.Mock).mockResolvedValue(undefined);

      await service.submitAddress(address);

      expect(dataAccessMock.submitAddress).toHaveBeenCalledWith(
        'rest1',
        address,
      );
      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'address-saved',
        outcome: 'success',
      });
    });

    it('should show danger toast on error', async () => {
      const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (dataAccessMock.submitAddress as jest.Mock).mockRejectedValue(
        new Error('fail'),
      );

      await service.submitAddress(address);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });
    });
  });

  describe('submitPosition', () => {
    const position: Geopoint = { latitude: 52.52, longitude: 13.405 };

    it('should do nothing when restaurant is undefined', async () => {
      await service.submitPosition(position);
      expect(dataAccessMock.submitPosition).not.toHaveBeenCalled();
    });

    it('should save position and show success toast', async () => {
      const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (dataAccessMock.submitPosition as jest.Mock).mockResolvedValue(undefined);

      await service.submitPosition(position);

      expect(dataAccessMock.submitPosition).toHaveBeenCalledWith(
        'rest1',
        position,
      );
      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'location-saved',
        outcome: 'success',
      });
    });

    it('should show danger toast on error', async () => {
      const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (dataAccessMock.submitPosition as jest.Mock).mockRejectedValue(
        new Error('fail'),
      );

      await service.submitPosition(position);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });
    });
  });

  describe('the photo (issue #2126)', () => {
    const restaurant = { id: 'r-1', name: 'x' } as Restaurant;

    it('starts a background upload of the chosen photo for the restaurant on screen', () => {
      dataAccessMock.restaurant = signal(restaurant) as never;
      service = TestBed.inject(EditRestaurantService);
      (service as unknown as { restaurant: unknown }).restaurant =
        signal(restaurant);

      service.savePhoto('data:image/jpeg;base64,AAAA');

      expect(photoUploadMock.start).toHaveBeenCalledWith(
        'r-1',
        'data:image/jpeg;base64,AAAA',
      );
    });

    it('does nothing without a restaurant', () => {
      service.savePhoto('data:image/jpeg;base64,AAAA');

      expect(photoUploadMock.start).not.toHaveBeenCalled();
    });

    it('shows only an upload for the restaurant on screen', () => {
      (service as unknown as { restaurant: unknown }).restaurant =
        signal(restaurant);
      photoUploadMock.upload.set({
        restaurantId: 'another',
        status: 'pending',
        photo: 'p',
      });

      expect(service.pendingPhoto()).toBeUndefined();
      expect(service.canRetryPhoto()).toBe(false);
    });

    it('retries through the upload service', () => {
      service.retryPhoto();

      expect(photoUploadMock.retry).toHaveBeenCalled();
    });
  });
});
