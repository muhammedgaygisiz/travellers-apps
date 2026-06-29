import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import { MapDataAccessService } from 'bite-tribe/map-data-access';
import { MapService } from '../map.service';
import type { Bite, Bucketlist, Geopoint, Like } from 'model';
import { BiteTrailDataAccessService } from 'bite-tribe/bite-trail-data-access';

describe(MapService.name, () => {
  let service: MapService;
  let mockDataAccess: jest.Mocked<MapDataAccessService>;
  let mockNavController: jest.Mocked<NavController>;

  const mockBites: Bite[] = [
    {
      id: 'bite1',
      userId: 'user1',
      place: 'Restaurant A',
      restaurantId: 'rest1',
    } as Bite,
    {
      id: 'bite2',
      userId: 'user2',
      place: 'Restaurant B',
      restaurantId: 'rest2',
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
      myBites: signal([mockBites[0], mockBites[2]]),
      bitesBySelectedBucketlist: signal([mockBites[0], mockBites[2]]),
      isAuthenticated: signal(true),
      selectedBucketlist: signal(mockBucketlist),
      gpsPosition: signal(mockGeopoint),
      userId: signal('user1'),
      userHasSubscriptionTierOne: signal(false),
    };

    const biteTrailDataAccessMock = {
      sortedBites: signal([]),
    };

    const navControllerMock = {
      navigateForward: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        MapService,
        { provide: MapDataAccessService, useValue: dataAccessMock },
        {
          provide: BiteTrailDataAccessService,
          useValue: biteTrailDataAccessMock,
        },
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

  describe('likeButtonClicked', () => {
    it('should submit like click through dataAccess', () => {
      const likeClick: Like = {
        likeType: 'thumbup',
        biteId: 'bite1',
        userId: 'user1',
        createdAt: '2024-06-01T12:00:00Z',
      };

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
});
