import { TestBed } from '@angular/core/testing';
import { NewRestaurantService } from '../new-restaurant.service';
import { RestaurantDataAccessService } from 'bite-tribe-business/restaurant-data-access';
import { NavController } from '@ionic/angular';
import { signal } from '@angular/core';
import { Bite, Restaurant } from 'model';

jest.mock('bite-tribe-business/restaurant-data-access');
jest.mock('@capacitor-firebase/firestore');

describe('NewRestaurantService', () => {
  let service: NewRestaurantService;
  let dataAccessMock: jest.Mocked<RestaurantDataAccessService>;
  let navControllerMock: { navigateForward: jest.Mock; navigateBack: jest.Mock };

  beforeEach(() => {
    dataAccessMock = {
      restaurantToCreate: signal(undefined),
      submitNewRestaurant: jest.fn(),
    } as unknown as jest.Mocked<RestaurantDataAccessService>;

    navControllerMock = {
      navigateForward: jest.fn(),
      navigateBack: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        NewRestaurantService,
        { provide: RestaurantDataAccessService, useValue: dataAccessMock },
        { provide: NavController, useValue: navControllerMock },
      ],
    });

    service = TestBed.inject(NewRestaurantService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('submitNewRestaurant', () => {
    it('should call dataAccess.submitNewRestaurant with the restaurant', () => {
      const restaurant = { id: '1', name: 'Test' } as Restaurant;
      service.submitNewRestaurant(restaurant);
      expect(dataAccessMock.submitNewRestaurant).toHaveBeenCalledWith(restaurant);
    });

    it('should navigate back to dashboard', () => {
      const restaurant = { id: '1', name: 'Test' } as Restaurant;
      service.submitNewRestaurant(restaurant);
      expect(navControllerMock.navigateBack).toHaveBeenCalledWith(['dashboard']);
    });
  });

  describe('biteClicked', () => {
    it('should navigate forward to bite/:id', () => {
      const bite = { id: 'bite1' } as Bite;
      service.biteClicked(bite);
      expect(navControllerMock.navigateForward).toHaveBeenCalledWith(['bite', 'bite1']);
    });
  });
});
