import { ContentRefusedError } from 'utils';
import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  EditRestaurantService,
  SECTION_TOASTS,
} from '../edit-restaurant.service';
import {
  RestaurantDataAccessService,
  RestaurantImageUploadService,
} from 'bite-tribe-business/restaurant-data-access';
import { LoadingController, NavController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { signal } from '@angular/core';
import { Address, Geopoint, Restaurant } from 'model';
import { ToastService } from 'toast';

jest.mock('bite-tribe-business/restaurant-data-access');
jest.mock('@capacitor-firebase/firestore');
jest.mock('@capacitor-firebase/analytics');

describe('EditRestaurantService', () => {
  let service: EditRestaurantService;
  let dataAccessMock: jest.Mocked<RestaurantDataAccessService>;
  let navControllerMock: {
    navigateForward: jest.Mock;
    navigateBack: jest.Mock;
  };
  let toastMock: { present: jest.Mock };
  let loading: { present: jest.Mock; dismiss: jest.Mock };
  let loadingControllerMock: { create: jest.Mock };
  let photoUploadMock: {
    upload: ReturnType<typeof signal>;
    statusFor: jest.Mock;
    refusalCategoryFor: jest.Mock;
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
      submitDietaryStatements: jest.fn(),
      submitAddress: jest.fn(),
      submitPosition: jest.fn(),
      submitTableOrderingSettings: jest.fn(),
    } as unknown as jest.Mocked<RestaurantDataAccessService>;

    navControllerMock = { navigateForward: jest.fn(), navigateBack: jest.fn() };
    toastMock = { present: jest.fn().mockResolvedValue(undefined) };
    loading = {
      present: jest.fn().mockResolvedValue(undefined),
      dismiss: jest.fn().mockResolvedValue(true),
    };
    loadingControllerMock = { create: jest.fn().mockResolvedValue(loading) };
    photoUploadMock = {
      upload: signal(undefined),
      statusFor: jest.fn().mockReturnValue(undefined),
      refusalCategoryFor: jest.fn().mockReturnValue(undefined),
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
        { provide: LoadingController, useValue: loadingControllerMock },
        {
          provide: TranslocoService,
          useValue: { translate: jest.fn((key: string) => key) },
        },
      ],
    });

    service = TestBed.inject(EditRestaurantService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  /** A section shows that it is saving (GitHub issue #2225). */
  describe('saving a section', () => {
    beforeEach(() => {
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set({
        id: 'rest1',
        name: 'Sakura Kitchen',
      } as Restaurant);
    });

    it('saves under the overlay, then confirms and goes back', async () => {
      const order: string[] = [];
      loading.present.mockImplementation(async () => order.push('present'));
      dataAccessMock.submitDescription.mockImplementation(async () => {
        order.push('write');
      });
      loading.dismiss.mockImplementation(async () => order.push('dismiss'));
      toastMock.present.mockImplementation(async () => order.push('toast'));

      await service.submitDescription('Ramen.');

      expect(loadingControllerMock.create).toHaveBeenCalledWith({
        message: 'restaurant-saving',
        backdropDismiss: false,
      });
      expect(order).toEqual(['present', 'write', 'dismiss', 'toast']);
      expect(navControllerMock.navigateBack).toHaveBeenCalledWith([
        'restaurant',
        'rest1',
      ]);
    });

    it('ends the overlay on a refused save and stays on the section', async () => {
      dataAccessMock.submitAddress.mockRejectedValue(new Error('denied'));

      await service.submitAddress({ city: 'Bled' } as Address);

      expect(loading.dismiss).toHaveBeenCalled();
      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'restaurant-section-address-not-saved',
        outcome: 'failure',
      });
      expect(navControllerMock.navigateBack).not.toHaveBeenCalled();
    });

    it('starts no second write while one is running, and allows the next after', async () => {
      let finish: () => void = () => undefined;
      dataAccessMock.submitCategories.mockReturnValue(
        new Promise<void>((resolve) => (finish = resolve)),
      );

      const first = service.submitCategories(['bar']);
      await service.submitCategories(['bar']);
      finish();
      await first;

      expect(dataAccessMock.submitCategories).toHaveBeenCalledTimes(1);

      dataAccessMock.submitCategories.mockResolvedValue(undefined);
      await service.submitCategories(['pub']);
      expect(dataAccessMock.submitCategories).toHaveBeenCalledTimes(2);
    });

    it('allows a retry after a refused save', async () => {
      dataAccessMock.submitPosition.mockRejectedValueOnce(new Error('x'));
      dataAccessMock.submitPosition.mockResolvedValueOnce(undefined);
      const position = { latitude: 1, longitude: 2 } as Geopoint;

      await service.submitPosition(position);
      await service.submitPosition(position);

      expect(dataAccessMock.submitPosition).toHaveBeenCalledTimes(2);
      expect(navControllerMock.navigateBack).toHaveBeenCalledTimes(1);
    });
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
        messageKey: 'restaurant-section-links-saved',
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
        messageKey: 'restaurant-section-links-not-saved',
        outcome: 'failure',
      });
    });
  });

  /** One section at a time (GitHub issue #2183). */
  describe('sections', () => {
    it('opens a section of the restaurant on screen', () => {
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set({
        id: 'rest1',
        name: 'Test',
      } as Restaurant);

      service.gotoSection('opening-hours');

      expect(navControllerMock.navigateForward).toHaveBeenCalledWith([
        'restaurant',
        'rest1',
        'edit',
        'opening-hours',
      ]);
    });

    it('opens nothing without a restaurant', () => {
      service.gotoSection('about');

      expect(navControllerMock.navigateForward).not.toHaveBeenCalled();
    });

    it('returns to the overview once a section is saved', async () => {
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set({
        id: 'rest1',
        name: 'Test',
      } as Restaurant);
      (dataAccessMock.submitDescription as jest.Mock).mockResolvedValue(
        undefined,
      );

      await service.submitDescription('A great place');

      expect(navControllerMock.navigateBack).toHaveBeenCalledWith([
        'restaurant',
        'rest1',
      ]);
    });

    it('stays on the section when the save fails, so the edit can be retried', async () => {
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set({
        id: 'rest1',
        name: 'Test',
      } as Restaurant);
      (dataAccessMock.submitDescription as jest.Mock).mockRejectedValue(
        new Error('fail'),
      );

      await service.submitDescription('A great place');

      expect(navControllerMock.navigateBack).not.toHaveBeenCalled();
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
        messageKey: 'restaurant-section-about-saved',
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
        messageKey: 'restaurant-section-about-not-saved',
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
        messageKey: 'restaurant-section-opening-hours-saved',
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
        messageKey: 'restaurant-section-opening-hours-not-saved',
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
          messageKey: 'restaurant-section-facilities-saved',
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
        messageKey: 'restaurant-section-facilities-not-saved',
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
        messageKey: 'restaurant-section-categories-saved',
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
        messageKey: 'restaurant-section-categories-not-saved',
        outcome: 'failure',
      });
    });
  });

  /** See GitHub issue #2194. */
  describe('submitDietaryStatements', () => {
    const value = {
      statements: ['fully-halal' as const],
      crossContaminationNote: 'Shared fryer.',
    };

    beforeEach(() => {
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set({
        id: 'rest1',
        name: 'Test',
      } as Restaurant);
    });

    it('saves them and confirms it', async () => {
      await service.submitDietaryStatements(value);

      expect(dataAccessMock.submitDietaryStatements).toHaveBeenCalledWith(
        'rest1',
        ['fully-halal'],
        'Shared fryer.',
      );
      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'restaurant-section-dietary-saved',
        outcome: 'success',
      });
    });

    it('says the note was refused when the content check refuses it', async () => {
      (dataAccessMock.submitDietaryStatements as jest.Mock).mockRejectedValue(
        new ContentRefusedError('crossContaminationNote'),
      );

      await service.submitDietaryStatements(value);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'content-refused',
        outcome: 'failure',
      });
    });

    it('says so when the save fails for another reason', async () => {
      (dataAccessMock.submitDietaryStatements as jest.Mock).mockRejectedValue(
        new Error('fail'),
      );

      await service.submitDietaryStatements(value);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'restaurant-section-dietary-not-saved',
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
        messageKey: 'restaurant-section-address-saved',
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
        messageKey: 'restaurant-section-address-not-saved',
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
        messageKey: 'restaurant-section-position-saved',
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
        messageKey: 'restaurant-section-position-not-saved',
        outcome: 'failure',
      });
    });
  });

  describe('submitTableOrderingSettings', () => {
    const restaurant = { id: 'rest1', name: 'Test' } as Restaurant;
    const settings = { enabled: true } as never;

    it('confirms with the section label', async () => {
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (
        dataAccessMock.submitTableOrderingSettings as jest.Mock
      ).mockResolvedValue(undefined);

      await service.submitTableOrderingSettings(settings);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'restaurant-section-table-ordering-saved',
        outcome: 'success',
      });
    });

    it('names the section when the save is refused', async () => {
      (dataAccessMock.restaurant as ReturnType<typeof signal>).set(restaurant);
      (
        dataAccessMock.submitTableOrderingSettings as jest.Mock
      ).mockRejectedValue(new Error('fail'));

      await service.submitTableOrderingSettings(settings);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'restaurant-section-table-ordering-not-saved',
        outcome: 'failure',
      });
    });
  });

  /**
   * One pattern for every section's toast (GitHub issue #2263): a key the
   * table names and the locale lacks would show the key itself.
   */
  describe('the save toasts', () => {
    const en = JSON.parse(
      readFileSync(
        resolve(
          __dirname,
          '../../../../../../../../apps/bite-tribe-business/src/assets/i18n/en.json',
        ),
        'utf8',
      ),
    ) as Record<string, string>;

    it.each(Object.entries(SECTION_TOASTS))(
      'has copy for both of %s',
      (section, { saved, notSaved }) => {
        const label = en[`restaurant-section-${section}`];

        expect(en[saved]).toBe(`${label} saved`);
        expect(en[notSaved]).toMatch(
          new RegExp(`^${label} (wasn't|weren't) saved\\. `),
        );
        expect(en[notSaved]).toContain('Your changes are still here');
      },
    );
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

    // GitHub issue #2141: only the image check publishes the photo.
    it('says the photo is being checked, for the restaurant on screen only', () => {
      (service as unknown as { restaurant: unknown }).restaurant =
        signal(restaurant);
      photoUploadMock.upload.set({
        restaurantId: 'r-1',
        status: 'pending',
        photo: 'p',
        checking: true,
      });
      expect(service.photoChecking()).toBe(true);

      photoUploadMock.upload.set({
        restaurantId: 'another',
        status: 'pending',
        checking: true,
      });
      expect(service.photoChecking()).toBe(false);
    });

    it('reads why the photo was refused from the upload service', () => {
      (service as unknown as { restaurant: unknown }).restaurant =
        signal(restaurant);
      photoUploadMock.refusalCategoryFor.mockReturnValue('hate');

      expect(service.photoRefusalCategory()).toBe('hate');
      expect(photoUploadMock.refusalCategoryFor).toHaveBeenCalledWith(
        restaurant,
      );
    });

    it('retries through the upload service', () => {
      service.retryPhoto();

      expect(photoUploadMock.retry).toHaveBeenCalled();
    });
  });
});
