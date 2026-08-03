import { of } from 'rxjs';
import { MapDataAccessService } from '../map-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { inject, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import type { LikeClick } from 'model';
import {
  getLocationPermissionState,
  openLocationSettings,
  requestLocationPermission,
} from 'geolocation';

jest.mock('geolocation', () => ({
  getLocationPermissionState: jest.fn(),
  openLocationSettings: jest.fn(),
  requestLocationPermission: jest.fn(),
}));

const getLocationPermissionStateMock = getLocationPermissionState as jest.Mock;
const openLocationSettingsMock = openLocationSettings as jest.Mock;
const requestLocationPermissionMock = requestLocationPermission as jest.Mock;

class Mock {
  bites$ = of([]);
  sortedMyBites$ = of([]);
  bitesBySelectedBucketlist$ = of([]);
  userId$ = of('test-user-id');
  selectedBucketlist$ = of(null);
  isAuthenticated$ = of(false);
  position$ = of(null);
  logout = (): null => null;
  submitLikeClick = (): null => null;
  reloadGPSPosition = (): null => null;
}

describe(MapDataAccessService.name, () => {
  let biteTribeStoreService: BiteTribeStoreService;

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MapDataAccessService,
        provideMockStore(),
        { provide: BiteTribeStoreService, useClass: Mock },
      ],
    }).compileComponents();
    biteTribeStoreService = TestBed.inject(BiteTribeStoreService);
  });

  it('should create the service', inject(
    [MapDataAccessService],
    (service: MapDataAccessService) => {
      expect(service).toBeTruthy();
    },
  ));

  describe('logout', () => {
    it('should call logout on BiteTribeStoreService', inject(
      [MapDataAccessService],
      (service: MapDataAccessService) => {
        const logoutSpy = jest.spyOn(biteTribeStoreService, 'logout');
        service.logout();
        expect(logoutSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('reloadGPSPosition', () => {
    it('should call reloadGPSPosition on BiteTribeStoreService', inject(
      [MapDataAccessService],
      (service: MapDataAccessService) => {
        const reloadSpy = jest.spyOn(
          biteTribeStoreService,
          'reloadGPSPosition',
        );
        service.reloadGPSPosition();
        expect(reloadSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('submitLikeClick', () => {
    it('should forward the like click to BiteTribeStoreService', inject(
      [MapDataAccessService],
      (service: MapDataAccessService) => {
        const submitLikeClickSpy = jest
          .spyOn(biteTribeStoreService, 'submitLikeClick')
          .mockImplementation();
        const likeClick: LikeClick = {
          likeType: 'thumbup',
          biteId: '456',
          action: 'save',
        };

        service.submitLikeClick(likeClick);

        expect(submitLikeClickSpy).toHaveBeenCalledTimes(1);
        expect(submitLikeClickSpy).toHaveBeenCalledWith(likeClick);
      },
    ));
  });

  /**
   * The map's My Position button settles the permission before it reads, so
   * these three routes have to reach `libs/common/geolocation` rather than a
   * re-implemented check — that is how a stray `requestPermissions` call gets
   * reintroduced (issue #1183).
   */
  describe('location permissions', () => {
    it('should delegate reading the permission state', inject(
      [MapDataAccessService],
      async (service: MapDataAccessService) => {
        getLocationPermissionStateMock.mockResolvedValue('denied');

        await expect(service.getLocationPermissionState()).resolves.toBe(
          'denied',
        );
        expect(getLocationPermissionStateMock).toHaveBeenCalledTimes(1);
      },
    ));

    it('should delegate requesting location permission', inject(
      [MapDataAccessService],
      async (service: MapDataAccessService) => {
        requestLocationPermissionMock.mockResolvedValue('granted');

        await expect(service.requestLocationPermission()).resolves.toBe(
          'granted',
        );
        expect(requestLocationPermissionMock).toHaveBeenCalledTimes(1);
      },
    ));

    it('should delegate opening location settings', inject(
      [MapDataAccessService],
      async (service: MapDataAccessService) => {
        openLocationSettingsMock.mockResolvedValue(true);

        await expect(service.openLocationSettings()).resolves.toBe(true);
        expect(openLocationSettingsMock).toHaveBeenCalledTimes(1);
      },
    ));
  });
});
