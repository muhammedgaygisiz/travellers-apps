import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular/standalone';
import {
  AdminRestaurantCandidate,
  RestaurantsDataAccessService,
} from 'bite-tribe-admin/restaurants-data-access';
import { RestaurantsService } from '../restaurants.service';

jest.mock('bite-tribe-admin/restaurants-data-access');
jest.mock('@capacitor-firebase/firestore');

/**
 * Both entry points into the new-restaurant form. They came from the business
 * dashboard service with issue #1473; the assertions came with them.
 */
describe('RestaurantsService', () => {
  let service: RestaurantsService;
  let dataAccessMock: jest.Mocked<RestaurantsDataAccessService>;
  let navControllerMock: { navigateForward: jest.Mock };

  beforeEach(() => {
    dataAccessMock = {
      restaurantCandidatesValue: jest.fn().mockReturnValue([]),
      bitePlacesValue: jest.fn().mockReturnValue([]),
      selectRestaurantToCreate: jest.fn(),
      logout: jest.fn(),
    } as unknown as jest.Mocked<RestaurantsDataAccessService>;

    navControllerMock = { navigateForward: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        RestaurantsService,
        { provide: RestaurantsDataAccessService, useValue: dataAccessMock },
        { provide: NavController, useValue: navControllerMock },
      ],
    });

    service = TestBed.inject(RestaurantsService);
  });

  describe('candidateClicked', () => {
    it('should select a prefilled unsaved restaurant with candidate Bite evidence', () => {
      const candidate = {
        id: 'candidate-1',
        name: 'Pizza Palace',
        position: { latitude: 46.948, longitude: 7.4474 },
        biteIds: ['bite-1'],
        bites: [{ id: 'bite-1', name: 'Margherita' }],
      } as AdminRestaurantCandidate;

      service.candidateClicked(candidate);

      expect(dataAccessMock.selectRestaurantToCreate).toHaveBeenCalledWith({
        id: '',
        name: 'Pizza Palace',
        position: { latitude: 46.948, longitude: 7.4474 },
        restaurantCandidateId: 'candidate-1',
        biteIds: ['bite-1'],
        bites: [{ id: 'bite-1', name: 'Margherita' }],
        unsaved: true,
      });
    });

    it('should navigate forward to new-restaurant', () => {
      service.candidateClicked({
        name: 'Pizza Palace',
        position: { latitude: 46.948, longitude: 7.4474 },
      } as AdminRestaurantCandidate);

      expect(navControllerMock.navigateForward).toHaveBeenCalledWith([
        'new-restaurant',
      ]);
    });
  });

  describe('placeClicked', () => {
    it('should select an unsaved restaurant carrying the place name', () => {
      service.placeClicked('Pizza Palace');

      expect(dataAccessMock.selectRestaurantToCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Pizza Palace',
          unsaved: true,
        }),
      );
    });

    it('should navigate forward to new-restaurant', () => {
      service.placeClicked('Pizza Palace');

      expect(navControllerMock.navigateForward).toHaveBeenCalledWith([
        'new-restaurant',
      ]);
    });
  });

  describe('logout', () => {
    it('should log out through data access', () => {
      service.logout();

      expect(dataAccessMock.logout).toHaveBeenCalled();
    });
  });
});
