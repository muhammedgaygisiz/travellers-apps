import { TestBed } from '@angular/core/testing';
import { DashboardService } from '../dashboard.service';
import { DashboardDataAccessService } from 'bite-tribe-business/dashboard-data-access';
import { NavController } from '@ionic/angular/standalone';
import { signal } from '@angular/core';

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
        const restaurant = { id: '123', name: 'Testaurant' } as any;
        service.restaurantClicked(restaurant);

        expect(navControllerMock.navigateForward).toHaveBeenCalledWith([
          'restaurant',
          '123',
        ]);
      });
    });

    describe('given no restaurant id', () => {
      it('should navigate forward to restaurant with encoded name', () => {
        const restaurant = { id: '', name: 'Testaurant' } as any;
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
        const organisation = { userId: 'org123', name: 'OrgName' } as any;
        service.organisationClicked(organisation);

        expect(navControllerMock.navigateForward).toHaveBeenCalledWith([
          'org123',
          'dashboard',
        ]);
      });
    });

    describe('given no user id in organisation', () => {
      it('should not navigate', () => {
        const organisation = { userId: '', name: 'OrgName' } as any;
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
});
