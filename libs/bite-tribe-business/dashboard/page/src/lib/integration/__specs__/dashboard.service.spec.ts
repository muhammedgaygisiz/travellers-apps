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
  let navControllerMock: { navigateForward: jest.Mock; navigateBack: jest.Mock };

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

  describe('placeClicked', () => {
    it('should call selectRestaurantToCreate with a restaurant containing the place name', () => {
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
