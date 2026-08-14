import { TestBed } from '@angular/core/testing';
import { NewRestaurantService } from '../new-restaurant.service';
import { RestaurantDataAccessService } from 'bite-tribe-business/restaurant-data-access';
import { NavController } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { Bite, GooglePlace, PlaceDetails, Restaurant } from 'model';
import { TranslocoService } from '@jsverse/transloco';
import { ToastService } from 'toast';
import { of } from 'rxjs';

jest.mock('bite-tribe-business/restaurant-data-access');
jest.mock('@capacitor-firebase/firestore');

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

describe('NewRestaurantService', () => {
  let service: NewRestaurantService;
  let dataAccessMock: jest.Mocked<RestaurantDataAccessService>;
  let navControllerMock: {
    navigateForward: jest.Mock;
    navigateBack: jest.Mock;
  };
  let toastPresent: jest.Mock;

  beforeEach(() => {
    dataAccessMock = {
      restaurantToCreate: signal(undefined),
      submitNewRestaurant: jest.fn(),
      verifyRestaurantCandidate: jest.fn().mockResolvedValue({
        restaurantId: 'restaurant-1',
        candidateId: 'candidate-1',
        status: 'created',
      }),
      searchPlaces: jest.fn().mockResolvedValue([]),
      getPlaceDetails: jest.fn(),
    } as unknown as jest.Mocked<RestaurantDataAccessService>;

    navControllerMock = {
      navigateForward: jest.fn(),
      navigateBack: jest.fn(),
    };

    toastPresent = jest.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        NewRestaurantService,
        { provide: RestaurantDataAccessService, useValue: dataAccessMock },
        { provide: NavController, useValue: navControllerMock },
        { provide: ToastService, useValue: { present: toastPresent } },
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    service = TestBed.inject(NewRestaurantService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('submitNewRestaurant', () => {
    it('should call dataAccess.submitNewRestaurant with the restaurant', async () => {
      const restaurant = { id: '1', name: 'Test' } as Restaurant;
      await service.submitNewRestaurant(restaurant);
      expect(dataAccessMock.submitNewRestaurant).toHaveBeenCalledWith(
        restaurant,
      );
    });

    it('should verify the restaurant candidate instead of using the normal save path', async () => {
      const restaurant = {
        id: '',
        name: 'Test',
        restaurantCandidateId: 'candidate-1',
      } as Restaurant;

      await service.submitNewRestaurant(restaurant);

      expect(dataAccessMock.verifyRestaurantCandidate).toHaveBeenCalledWith(
        restaurant,
      );
      expect(dataAccessMock.submitNewRestaurant).not.toHaveBeenCalled();
    });

    it('should navigate back to dashboard', async () => {
      const restaurant = { id: '1', name: 'Test' } as Restaurant;
      await service.submitNewRestaurant(restaurant);
      expect(navControllerMock.navigateBack).toHaveBeenCalledWith([
        'dashboard',
      ]);
    });
  });

  describe('biteClicked', () => {
    it('should navigate forward to bite/:id', () => {
      const bite = { id: 'bite1' } as Bite;
      service.biteClicked(bite);
      expect(navControllerMock.navigateForward).toHaveBeenCalledWith([
        'bite',
        'bite1',
      ]);
    });
  });

  describe('searchPrefillPlaces', () => {
    it('searches Google places with the candidate name and position', async () => {
      const position = { latitude: 1, longitude: 2 };
      const places: GooglePlace[] = [
        {
          placeId: 'p1',
          name: 'Found',
          address: 'addr',
          position,
        },
      ];
      dataAccessMock.searchPlaces.mockResolvedValue(places);

      await service.searchPrefillPlaces({ name: 'Trattoria', position });

      expect(dataAccessMock.searchPlaces).toHaveBeenCalledWith(
        'Trattoria',
        position,
      );
      expect(service.googlePlaces()).toEqual(places);
      expect(service.googlePlacesLoading()).toBe(false);
    });
  });

  describe('searchGooglePlaces', () => {
    it('reuses the candidate position from the last prefill search', async () => {
      const position = { latitude: 1, longitude: 2 };
      await service.searchPrefillPlaces({ name: 'Trattoria', position });

      await service.searchGooglePlaces('Pizzeria');

      expect(dataAccessMock.searchPlaces).toHaveBeenLastCalledWith(
        'Pizzeria',
        position,
      );
    });
  });

  describe('loadPlaceDetails', () => {
    it('stores the loaded place details', async () => {
      const details: PlaceDetails = {
        placeId: 'p1',
        name: 'Found',
        address: { street: '', postcode: '', city: '', country: '' },
        openingHours: [],
      };
      dataAccessMock.getPlaceDetails.mockResolvedValue(details);

      await service.loadPlaceDetails('p1');

      expect(dataAccessMock.getPlaceDetails).toHaveBeenCalledWith('p1');
      expect(service.placeDetails()).toEqual(details);
      expect(service.placeDetailsLoading()).toBe(false);
      expect(toastPresent).not.toHaveBeenCalled();
    });

    it('shows an error toast and leaves details unset when nothing is returned', async () => {
      dataAccessMock.getPlaceDetails.mockResolvedValue(undefined);

      await service.loadPlaceDetails('p1');

      expect(service.placeDetails()).toBeUndefined();
      expect(toastPresent).toHaveBeenCalledWith({
        messageKey: 'prefill-error',
        outcome: 'failure',
      });
    });

    it('shows an error toast when the lookup throws', async () => {
      dataAccessMock.getPlaceDetails.mockRejectedValue(new Error('boom'));

      await service.loadPlaceDetails('p1');

      expect(service.placeDetails()).toBeUndefined();
      expect(toastPresent).toHaveBeenCalledWith({
        messageKey: 'prefill-error',
        outcome: 'failure',
      });
      expect(service.placeDetailsLoading()).toBe(false);
    });
  });
});
