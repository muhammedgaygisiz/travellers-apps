import { TestBed } from '@angular/core/testing';
import {
  AppForegroundService,
  FOREGROUND_REFRESH_THRESHOLD_MS,
} from '../app-foreground.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { provideMockStore } from '@ngrx/store/testing';

describe(AppForegroundService.name, () => {
  let service: AppForegroundService;
  let storeService: BiteTribeStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideMockStore()],
    });

    service = TestBed.inject(AppForegroundService);
    storeService = TestBed.inject(BiteTribeStoreService);
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
    });
  });

  describe('FOREGROUND_REFRESH_THRESHOLD_MS', () => {
    it('should be 30 seconds', () => {
      expect(FOREGROUND_REFRESH_THRESHOLD_MS).toBe(30_000);
    });
  });
});
