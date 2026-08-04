import { TestBed } from '@angular/core/testing';
import {
  AppForegroundService,
  FOREGROUND_REFRESH_THRESHOLD_MS,
} from '../app-foreground.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AuthService, fromAuth } from 'ta-firestore';
import { NavController } from '@ionic/angular';
import { Network } from '@capacitor/network';

jest.mock('@capacitor/network', () => ({
  Network: { getStatus: jest.fn() },
}));

const getStatus = Network.getStatus as jest.Mock;
const flushPromises = (): Promise<unknown> =>
  new Promise((resolve) => setTimeout(resolve, 0));

describe(AppForegroundService.name, () => {
  let service: AppForegroundService;
  let storeService: BiteTribeStoreService;
  let store: MockStore;
  let refreshSession: jest.Mock;
  let navigateRoot: jest.Mock;

  beforeEach(() => {
    refreshSession = jest.fn().mockResolvedValue(true);
    navigateRoot = jest.fn();
    getStatus.mockResolvedValue({ connected: true });

    TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          selectors: [
            { selector: fromAuth.selectIsAuthenticated, value: false },
          ],
        }),
        { provide: AuthService, useValue: { refreshSession } },
        { provide: NavController, useValue: { navigateRoot } },
      ],
    });

    service = TestBed.inject(AppForegroundService);
    storeService = TestBed.inject(BiteTribeStoreService);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should create the service', () => {
    expect(service).toBeTruthy();
  });

  describe('handleAppStateChange', () => {
    describe('when app goes to background (isActive = false)', () => {
      it('should store the background timestamp', () => {
        jest.useFakeTimers();
        const now = 1_000_000;
        jest.setSystemTime(now);

        service.handleAppStateChange(false);

        expect(service['lastBackgroundTimestamp']).toBe(now);
      });
    });

    describe('when app returns to foreground (isActive = true)', () => {
      it('should not trigger refresh if no background timestamp is set', () => {
        const reloadSpy = jest
          .spyOn(storeService, 'reloadGPSPosition')
          .mockImplementation();

        service.handleAppStateChange(true);

        expect(reloadSpy).not.toHaveBeenCalled();
      });

      it('should not trigger refresh if inactive duration is below threshold', () => {
        jest.useFakeTimers();
        const reloadSpy = jest
          .spyOn(storeService, 'reloadGPSPosition')
          .mockImplementation();

        jest.setSystemTime(1_000_000);
        service.handleAppStateChange(false);

        jest.setSystemTime(1_000_000 + FOREGROUND_REFRESH_THRESHOLD_MS - 1);
        service.handleAppStateChange(true);

        expect(reloadSpy).not.toHaveBeenCalled();
      });

      it('should trigger refresh if inactive duration exceeds threshold', () => {
        jest.useFakeTimers();
        const reloadSpy = jest
          .spyOn(storeService, 'reloadGPSPosition')
          .mockImplementation();

        jest.setSystemTime(1_000_000);
        service.handleAppStateChange(false);

        jest.setSystemTime(1_000_000 + FOREGROUND_REFRESH_THRESHOLD_MS + 1);
        service.handleAppStateChange(true);

        expect(reloadSpy).toHaveBeenCalledTimes(1);
      });

      it('should reset the background timestamp after triggering a refresh', () => {
        jest.useFakeTimers();
        const reloadSpy = jest
          .spyOn(storeService, 'reloadGPSPosition')
          .mockImplementation();

        jest.setSystemTime(1_000_000);
        service.handleAppStateChange(false);

        jest.setSystemTime(1_000_000 + FOREGROUND_REFRESH_THRESHOLD_MS + 1);
        service.handleAppStateChange(true);

        // A second foreground event without a new background event should not trigger refresh
        service.handleAppStateChange(true);

        expect(reloadSpy).toHaveBeenCalledTimes(1);
        expect(service['lastBackgroundTimestamp']).toBeNull();
      });

      it('should not trigger refresh if inactive duration equals threshold exactly', () => {
        jest.useFakeTimers();
        const reloadSpy = jest
          .spyOn(storeService, 'reloadGPSPosition')
          .mockImplementation();

        jest.setSystemTime(1_000_000);
        service.handleAppStateChange(false);

        jest.setSystemTime(1_000_000 + FOREGROUND_REFRESH_THRESHOLD_MS);
        service.handleAppStateChange(true);

        expect(reloadSpy).not.toHaveBeenCalled();
      });

      describe('updateUserMetadata', () => {
        it('should not call updateUserMetadata if no background timestamp is set', () => {
          const updateUserMetadataSpy = jest
            .spyOn(storeService, 'updateUserMetadata')
            .mockImplementation();

          service.handleAppStateChange(true);

          expect(updateUserMetadataSpy).not.toHaveBeenCalled();
        });

        it('should not call updateUserMetadata when user is not authenticated', () => {
          store.overrideSelector(fromAuth.selectIsAuthenticated, false);
          store.refreshState();

          const updateUserMetadataSpy = jest
            .spyOn(storeService, 'updateUserMetadata')
            .mockImplementation();

          service.handleAppStateChange(false);
          service.handleAppStateChange(true);

          expect(updateUserMetadataSpy).not.toHaveBeenCalled();
        });

        it('should call updateUserMetadata when user is authenticated and app returns to foreground', () => {
          store.overrideSelector(fromAuth.selectIsAuthenticated, true);
          store.refreshState();

          const updateUserMetadataSpy = jest
            .spyOn(storeService, 'updateUserMetadata')
            .mockImplementation();

          service.handleAppStateChange(false);
          service.handleAppStateChange(true);

          expect(updateUserMetadataSpy).toHaveBeenCalledTimes(1);
        });
      });
    });
  });

  describe('session refresh on significant foreground', () => {
    const triggerSignificantForeground = (): void => {
      jest.spyOn(storeService, 'reloadGPSPosition').mockImplementation();
      service['lastBackgroundTimestamp'] =
        Date.now() - (FOREGROUND_REFRESH_THRESHOLD_MS + 1_000);
      service.handleAppStateChange(true);
    };

    const setAuthenticated = (value: boolean): void => {
      store.overrideSelector(fromAuth.selectIsAuthenticated, value);
      store.refreshState();
    };

    it('refreshes the session when authenticated and online', async () => {
      setAuthenticated(true);

      triggerSignificantForeground();
      await flushPromises();

      expect(refreshSession).toHaveBeenCalledTimes(1);
      expect(navigateRoot).not.toHaveBeenCalled();
    });

    it('routes to /start when the session is no longer valid', async () => {
      setAuthenticated(true);
      refreshSession.mockResolvedValue(false);

      triggerSignificantForeground();
      await flushPromises();

      expect(navigateRoot).toHaveBeenCalledWith('/start');
    });

    it('does not refresh when the user is not authenticated', async () => {
      setAuthenticated(false);

      triggerSignificantForeground();
      await flushPromises();

      expect(getStatus).not.toHaveBeenCalled();
      expect(refreshSession).not.toHaveBeenCalled();
    });

    it('does not refresh when offline', async () => {
      setAuthenticated(true);
      getStatus.mockResolvedValue({ connected: false });

      triggerSignificantForeground();
      await flushPromises();

      expect(refreshSession).not.toHaveBeenCalled();
    });

    it('does not refresh below the inactivity threshold', async () => {
      setAuthenticated(true);
      jest.spyOn(storeService, 'reloadGPSPosition').mockImplementation();

      service['lastBackgroundTimestamp'] = Date.now();
      service.handleAppStateChange(true);
      await flushPromises();

      expect(refreshSession).not.toHaveBeenCalled();
    });
  });

  /**
   * The settings page is the only way back from a denied location permission,
   * and that round trip is far shorter than the inactivity threshold. Before
   * issue #1183 the restored grant went unnoticed until a manual refresh.
   */
  describe('gps recovery on return from the settings page', () => {
    const setGpsError = (value: boolean): void => {
      store.setState({ app: { errorLoadingGpsPosition: value } });
      store.refreshState();
    };

    it('re-reads the position on a short return when an error is showing', () => {
      jest.useFakeTimers();
      const reloadSpy = jest
        .spyOn(storeService, 'reloadGPSPosition')
        .mockImplementation();
      setGpsError(true);

      jest.setSystemTime(1_000_000);
      service.handleAppStateChange(false);

      jest.setSystemTime(1_000_000 + 1_000);
      service.handleAppStateChange(true);

      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it('stays quiet on a short return without a location error', () => {
      jest.useFakeTimers();
      const reloadSpy = jest
        .spyOn(storeService, 'reloadGPSPosition')
        .mockImplementation();
      setGpsError(false);

      jest.setSystemTime(1_000_000);
      service.handleAppStateChange(false);

      jest.setSystemTime(1_000_000 + 1_000);
      service.handleAppStateChange(true);

      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it('does not re-read on a foreground event that follows no background', () => {
      const reloadSpy = jest
        .spyOn(storeService, 'reloadGPSPosition')
        .mockImplementation();
      setGpsError(true);

      service.handleAppStateChange(true);

      expect(reloadSpy).not.toHaveBeenCalled();
    });
  });

  /**
   * A user who saved a Bite offline and switched the radio back on without
   * leaving the app hits no other refresh hook, so the feed stayed on whatever
   * the offline session had produced until a manual pull (issue #1230).
   */
  describe('handleNetworkStatusChange', () => {
    const setAuthenticated = (value: boolean): void => {
      store.overrideSelector(fromAuth.selectIsAuthenticated, value);
      store.refreshState();
    };

    it('resynchronizes the feed once connectivity comes back', () => {
      setAuthenticated(true);
      const reloadSpy = jest
        .spyOn(storeService, 'reloadGPSPosition')
        .mockImplementation();

      service.handleNetworkStatusChange({
        connected: false,
        connectionType: 'none',
      });
      service.handleNetworkStatusChange({
        connected: true,
        connectionType: 'wifi',
      });

      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    it('ignores a repeated connected event that follows no outage', () => {
      setAuthenticated(true);
      const reloadSpy = jest
        .spyOn(storeService, 'reloadGPSPosition')
        .mockImplementation();

      service.handleNetworkStatusChange({
        connected: true,
        connectionType: 'wifi',
      });
      service.handleNetworkStatusChange({
        connected: true,
        connectionType: 'cellular',
      });

      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it('does not resynchronize for a signed-out user', () => {
      setAuthenticated(false);
      const reloadSpy = jest
        .spyOn(storeService, 'reloadGPSPosition')
        .mockImplementation();

      service.handleNetworkStatusChange({
        connected: false,
        connectionType: 'none',
      });
      service.handleNetworkStatusChange({
        connected: true,
        connectionType: 'wifi',
      });

      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it('resynchronizes once per outage', () => {
      setAuthenticated(true);
      const reloadSpy = jest
        .spyOn(storeService, 'reloadGPSPosition')
        .mockImplementation();

      service.handleNetworkStatusChange({
        connected: false,
        connectionType: 'none',
      });
      service.handleNetworkStatusChange({
        connected: true,
        connectionType: 'wifi',
      });
      service.handleNetworkStatusChange({
        connected: true,
        connectionType: 'wifi',
      });

      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('FOREGROUND_REFRESH_THRESHOLD_MS', () => {
    it('should be 30 seconds', () => {
      expect(FOREGROUND_REFRESH_THRESHOLD_MS).toBe(30_000);
    });
  });
});
