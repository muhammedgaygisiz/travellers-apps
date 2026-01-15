import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import { MapDataAccessService } from 'bite-tribe/map-data-access';
import { MapService } from '../map.service';
import type { Bite, Bucketlist, Geopoint } from 'model';

describe('MapService', () => {
  let service: MapService;
  let mockDataAccess: jest.Mocked<MapDataAccessService>;
  let mockNavController: jest.Mocked<NavController>;

  const mockBites: Bite[] = [
    {
      id: 'bite1',
      userId: 'user1',
      place: 'Restaurant A',
      restaurantId: 'restaurants/collection/rest1',
    } as Bite,
    {
      id: 'bite2',
      userId: 'user2',
      place: 'Restaurant B',
      restaurantId: 'restaurants/collection/rest2',
    } as Bite,
    {
      id: 'bite3',
      userId: 'user1',
      place: 'Restaurant C',
      restaurantId: null as any,
    } as Bite,
  ];

  const mockGeopoint: Geopoint = {
    latitude: 51.505,
    longitude: -0.09,
  };

  const mockBucketlist: Bucketlist = {
    id: 'bucket1',
    name: 'My Bucketlist',
    biteIds: ['bite1', 'bite3'],
  } as Bucketlist;

  beforeEach(() => {
    const dataAccessMock = {
      logout: jest.fn(),
      submitLikeClick: jest.fn(),
      bites: signal(mockBites),
      isAuthenticated: signal(true),
      selectedBucketlist: signal(mockBucketlist),
      gpsPosition: signal(mockGeopoint),
      userId: signal('user1'),
    };

    const navControllerMock = {
      navigateForward: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        MapService,
        { provide: MapDataAccessService, useValue: dataAccessMock },
        { provide: NavController, useValue: navControllerMock },
      ],
    });

    service = TestBed.inject(MapService);
    mockDataAccess = TestBed.inject(
      MapDataAccessService,
    ) as jest.Mocked<MapDataAccessService>;
    mockNavController = TestBed.inject(
      NavController,
    ) as jest.Mocked<NavController>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('bitesBySelectedBucketlist', () => {
    it('should return user-specific bites in myBites', () => {
      const result = service.myBites();

      expect(result).toEqual([mockBites[0], mockBites[2]]);
      expect(result.length).toBe(2);
      expect(result.every((bite) => bite.userId === 'user1')).toBe(true);
    });

    it('should return bites for selected bucketlist', () => {
      const result = service.bitesBySelectedBucketlist();

      expect(result).toEqual([mockBites[0], mockBites[2]]);
      expect(result.length).toBe(2);
    });
  });

  describe('logout', () => {
    it('should call dataAccess logout method', () => {
      service.logout();

      expect(mockDataAccess.logout).toHaveBeenCalledTimes(1);
    });
  });

  describe('onGotoSettingsClick', () => {
    it('should navigate to settings when onGotoSettingsClick is called', () => {
      service.onGotoSettingsClick();

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'settings',
      ]);
    });
  });

  describe('onGotoMyBitesClick', () => {
    it('should navigate to my-bites when onGotoMyBitesClick is called', () => {
      service.onGotoMyBitesClick();

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'my-bites',
      ]);
    });
  });

  describe('onGotoMyBucketlists', () => {
    it('should navigate to my-bucketlists when onGotoMyBucketlists is called', () => {
      service.onGotoMyBucketlists();

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'my-bucketlists',
      ]);
    });
  });

  describe('likeButtonClicked', () => {
    it('should submit like click through dataAccess', () => {
      const likeClick = { likeType: 'heart', biteId: 'bite1' };

      service.likeButtonClicked(likeClick);

      expect(mockDataAccess.submitLikeClick).toHaveBeenCalledWith(likeClick);
    });
  });

  describe('biteClicked', () => {
    it('should navigate to bite detail page', () => {
      const bite = mockBites[0];

      service.biteClicked(bite);

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        'bite1',
      ]);
    });
  });

  describe('restaurantClicked', () => {
    it('should navigate to restaurant page with extracted restaurant ID when restaurantId exists', () => {
      const bite = mockBites[0];

      service.restaurantClicked(bite);

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        'bite1',
        'restaurant',
        'rest1',
      ]);
    });

    it('should navigate to restaurant page with encoded place when restaurantId is null', () => {
      const bite = mockBites[2];

      service.restaurantClicked(bite);

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        'bite3',
        'restaurant',
        'Restaurant%20C',
      ]);
    });

    it('should navigate to restaurant page with encoded place when restaurantId is undefined', () => {
      const biteWithUndefinedRestaurantId = {
        ...mockBites[0],
        restaurantId: undefined,
        place: 'Test Restaurant',
      };

      service.restaurantClicked(biteWithUndefinedRestaurantId);

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        'bite1',
        'restaurant',
        'Test%20Restaurant',
      ]);
    });

    it('should handle different restaurantId format patterns', () => {
      const biteWithDifferentFormat = {
        ...mockBites[0],
        restaurantId: 'prefix/middle/suffix',
      };

      service.restaurantClicked(biteWithDifferentFormat);

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'bite',
        'bite1',
        'restaurant',
        'suffix',
      ]);
    });
  });

  describe('onGotoMyProfileClick', () => {
    it('should navigate to my-profile when onGotoMyProfileClick is called', () => {
      service.onGotoMyProfileClick();

      expect(mockNavController.navigateForward).toHaveBeenCalledWith([
        'my-profile',
      ]);
    });
  });
});
