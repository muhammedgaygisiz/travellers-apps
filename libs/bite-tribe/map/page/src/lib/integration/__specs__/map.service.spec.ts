import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { MapDataAccessService } from 'bite-tribe/map-data-access';
import { MapService } from '../map.service';
import type { Bite, Bucketlist, Geopoint, LikeClick } from 'model';
import { BiteTrailDataAccessService } from 'bite-tribe/bite-trail-data-access';

describe(MapService.name, () => {
  let service: MapService;
  let mockDataAccess: jest.Mocked<MapDataAccessService>;
  let mockNavController: jest.Mocked<NavController>;
  let alertControllerMock: { create: jest.Mock };
  let presentedAlert: { present: jest.Mock };

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
      reloadGPSPosition: jest.fn(),
      myBites: signal([mockBites[0], mockBites[2]]),
      bitesBySelectedBucketlist: signal([mockBites[0], mockBites[2]]),
      isAuthenticated: signal(true),
      selectedBucketlist: signal(mockBucketlist),
      gpsPosition: signal(mockGeopoint),
      userId: signal('user1'),
      getLocationPermissionState: jest.fn().mockResolvedValue('granted'),
      requestLocationPermission: jest.fn().mockResolvedValue('granted'),
      openLocationSettings: jest.fn().mockResolvedValue(true),
    };

    const biteTrailDataAccessMock = {
      sortedBites: signal([]),
    };

    const navControllerMock = {
      navigateForward: jest.fn(),
    };

    presentedAlert = { present: jest.fn() };
    alertControllerMock = {
      create: jest.fn().mockResolvedValue(presentedAlert),
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
        { provide: AlertController, useValue: alertControllerMock },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string): string => key },
        },
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

  describe('refresh', () => {
    /** Reads the button labels out of the created alert, in order. */
    const alertButtonTexts = (): string[] =>
      alertControllerMock.create.mock.calls[0][0].buttons.map(
        (button: { text: string }) => button.text,
      );

    it('should reload the gps position through dataAccess', async () => {
      await service.refresh();

      expect(mockDataAccess.reloadGPSPosition).toHaveBeenCalledTimes(1);
      expect(alertControllerMock.create).not.toHaveBeenCalled();
    });

    it('should not prompt when the permission is already granted', async () => {
      await service.refresh();

      expect(mockDataAccess.requestLocationPermission).not.toHaveBeenCalled();
    });

    // The web build has no pre-checkable grant; the browser asks on read.
    it('should stay silent when the platform has no permission to check', async () => {
      mockDataAccess.getLocationPermissionState.mockResolvedValue(
        'unsupported',
      );

      await service.refresh();

      expect(mockDataAccess.reloadGPSPosition).toHaveBeenCalledTimes(1);
      expect(alertControllerMock.create).not.toHaveBeenCalled();
    });

    describe('when the OS still has a prompt left', () => {
      beforeEach(() => {
        mockDataAccess.getLocationPermissionState.mockResolvedValue('prompt');
      });

      it('should ask instead of sending the user to the settings page', async () => {
        await service.refresh();

        expect(mockDataAccess.requestLocationPermission).toHaveBeenCalledTimes(
          1,
        );
        expect(alertControllerMock.create).not.toHaveBeenCalled();
        expect(mockDataAccess.reloadGPSPosition).toHaveBeenCalledTimes(1);
      });

      it('should explain the denial when the prompt is refused', async () => {
        mockDataAccess.requestLocationPermission.mockResolvedValue('denied');

        await service.refresh();

        expect(presentedAlert.present).toHaveBeenCalledTimes(1);
      });
    });

    describe('when location access is denied', () => {
      beforeEach(() => {
        mockDataAccess.getLocationPermissionState.mockResolvedValue('denied');
      });

      // The OS ignores further permission requests once denied.
      it('should not spend a permission request that cannot succeed', async () => {
        await service.refresh();

        expect(mockDataAccess.requestLocationPermission).not.toHaveBeenCalled();
      });

      it('should explain the denial and offer the settings handoff', async () => {
        await service.refresh();

        expect(presentedAlert.present).toHaveBeenCalledTimes(1);
        expect(alertControllerMock.create).toHaveBeenCalledWith(
          expect.objectContaining({
            header: 'location-permission-denied-title',
            message: 'location-permission-denied',
          }),
        );
        expect(alertButtonTexts()).toEqual([
          'cancel',
          'open-location-settings-confirm',
        ]);
      });

      it('should open the settings page from the confirm action', async () => {
        await service.refresh();

        const confirmButton =
          alertControllerMock.create.mock.calls[0][0].buttons[1];
        confirmButton.handler();

        expect(mockDataAccess.openLocationSettings).toHaveBeenCalledTimes(1);
      });

      // The shared error state is what the home feed's card and the
      // foreground recovery both read, so the blocked read still records it.
      it('should still record the blocked read in the store', async () => {
        await service.refresh();

        expect(mockDataAccess.reloadGPSPosition).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('likeButtonClicked', () => {
    it('should submit like click through dataAccess', () => {
      const likeClick: LikeClick = {
        likeType: 'thumbup',
        biteId: 'bite1',
        action: 'save',
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
