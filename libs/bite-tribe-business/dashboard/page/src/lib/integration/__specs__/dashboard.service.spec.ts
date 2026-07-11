import { TestBed } from '@angular/core/testing';
import { DashboardService } from '../dashboard.service';
import {
  DashboardDataAccessService,
  DashboardRestaurantCandidate,
} from 'bite-tribe-business/dashboard-data-access';
import { NavController } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { PublicUser, Restaurant } from 'model';

jest.mock('bite-tribe-business/dashboard-data-access');
jest.mock('@capacitor-firebase/firestore');

describe('DashboardService', () => {
  let service: DashboardService;
  let dataAccessMock: jest.Mocked<DashboardDataAccessService>;
  let navControllerMock: {
    navigateForward: jest.Mock;
    navigateBack: jest.Mock;
  };

  beforeEach(() => {
    const mockResource = { value: jest.fn().mockReturnValue(undefined) };

    dataAccessMock = {
      restaurants: mockResource,
      organisations: mockResource,
      bitePlaces: mockResource,
      restaurantCandidates: mockResource,
      isAuthenticated: signal(false),
      gpsPosition: signal(null),
      logout: jest.fn(),
      selectRestaurantToCreate: jest.fn(),
    } as unknown as jest.Mocked<DashboardDataAccessService>;

    navControllerMock = {
      navigateForward: jest.fn(),
      navigateBack: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        {
          provide: DashboardDataAccessService,
          useValue: dataAccessMock,
        },
        {
          provide: NavController,
          useValue: navControllerMock,
        },
      ],
    });

    service = TestBed.inject(DashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('logout', () => {
    it('should call logout on data access layer', () => {
      service.logout();

      expect(dataAccessMock.logout).toHaveBeenCalled();
    });
  });

  describe('restaurantClicked', () => {
    describe('given a restaurant id', () => {
      it('should navigate forward to restaurant with id', () => {
        const restaurant = {
          id: '123',
          name: 'Testaurant',
        } as Restaurant;
        service.restaurantClicked(restaurant);

        expect(navControllerMock.navigateForward).toHaveBeenCalledWith([
          'restaurant',
          '123',
        ]);
      });
    });

    describe('given no restaurant id', () => {
      it('should navigate forward to restaurant with encoded name', () => {
        const restaurant = {
          id: '',
          name: 'Testaurant',
        } as Restaurant;
        service.restaurantClicked(restaurant);

        expect(navControllerMock.navigateForward).toHaveBeenCalledWith([
          'restaurant',
          'Testaurant',
        ]);
      });
    });
  });

  describe('organisationClicked', () => {
    describe('given an user id in organisation', () => {
      it('should navigate forward to organisation dashboard with user id', () => {
        const organisation = {
          userId: 'org123',
          displayName: 'OrgName',
        } as PublicUser;
        service.organisationClicked(organisation);

        expect(navControllerMock.navigateForward).toHaveBeenCalledWith([
          'org123',
          'dashboard',
        ]);
      });
    });

    describe('given no user id in organisation', () => {
      it('should not navigate', () => {
        const organisation = {
          userId: '',
          displayName: 'OrgName',
        } as PublicUser;
        service.organisationClicked(organisation);

        expect(navControllerMock.navigateForward).not.toHaveBeenCalled();
      });
    });
  });

  describe('gotoMigrations', () => {
    it('should navigate forward to migrations', () => {
      service.gotoMigrations();

      expect(navControllerMock.navigateForward).toHaveBeenCalledWith([
        'migrations',
      ]);
    });
  });

  describe('onMenuNavigate', () => {
    it('should navigate to migrations for the migrations target', () => {
      service.onMenuNavigate('migrations');

      expect(navControllerMock.navigateForward).toHaveBeenCalledWith([
        'migrations',
      ]);
    });

    it('should not navigate for any other target', () => {
      service.onMenuNavigate('settings');

      expect(navControllerMock.navigateForward).not.toHaveBeenCalled();
    });
  });

  describe('placeClicked', () => {
    it('should call selectAndNavigateToCreateRestaurantPageClicked with a restaurant containing the place name', () => {
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

  describe('restaurantCandidateClicked', () => {
    it('should select a prefilled unsaved restaurant with candidate Bite evidence', () => {
      const candidate = {
        id: 'candidate-1',
        name: 'Pizza Palace',
        position: { latitude: 46.948, longitude: 7.4474 },
        biteIds: ['bite-1'],
        bites: [{ id: 'bite-1', name: 'Margherita' }],
      } as DashboardRestaurantCandidate;

      service.restaurantCandidateClicked(candidate);

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
      service.restaurantCandidateClicked({
        name: 'Pizza Palace',
        position: { latitude: 46.948, longitude: 7.4474 },
      } as DashboardRestaurantCandidate);

      expect(navControllerMock.navigateForward).toHaveBeenCalledWith([
        'new-restaurant',
      ]);
    });
  });
});
