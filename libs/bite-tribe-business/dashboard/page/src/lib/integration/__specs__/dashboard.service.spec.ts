import { TestBed } from '@angular/core/testing';
import { DashboardService } from '../dashboard.service';
import { DashboardDataAccessService } from 'bite-tribe-business/dashboard-data-access';
import { NavController } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { Restaurant } from 'model';
import { DashboardSection } from '../../component/page/dashboard.component';

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
      biteTrails: mockResource,
      isAuthenticated: signal(false),
      gpsPosition: signal(null),
      logout: jest.fn(),
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

  describe('createBiteTrailClicked', () => {
    it('should navigate forward to create-bite-trail', () => {
      service.createBiteTrailClicked();

      expect(navControllerMock.navigateForward).toHaveBeenCalledWith([
        'create-bite-trail',
      ]);
    });
  });

  describe('sectionClicked', () => {
    it('should navigate forward to the section path', () => {
      service.sectionClicked({ path: '/restaurants' } as DashboardSection);

      expect(navControllerMock.navigateForward).toHaveBeenCalledWith([
        '/restaurants',
      ]);
    });
  });
});
