import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { CrashReportingService } from '../crash-reporting.service';

jest.mock('@capacitor/core');
jest.mock('@capacitor-firebase/crashlytics', () => {
  return {
    FirebaseCrashlytics: {
      recordException: jest.fn(),
    },
  };
});

describe(CrashReportingService.name, () => {
  let service: CrashReportingService;
  let recordException: jest.SpyInstance;
  const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({ providers: [CrashReportingService] });

    service = TestBed.inject(CrashReportingService);
    recordException = jest
      .spyOn(FirebaseCrashlytics, 'recordException')
      .mockResolvedValue();
  });

  afterAll(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('given a native platform', () => {
    beforeEach(() => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    });

    it('should file the report with its context', async () => {
      await service.recordNonFatal('Bite details load failed', {
        biteId: 'bite-1',
        branch: 'not-found',
      });

      expect(recordException).toHaveBeenCalledWith({
        message: 'Bite details load failed (biteId=bite-1 branch=not-found)',
      });
    });

    it('should leave out context that carries nothing', async () => {
      await service.recordNonFatal('Bite details load failed', {
        biteId: 'bite-1',
        error: '',
      });

      expect(recordException).toHaveBeenCalledWith({
        message: 'Bite details load failed (biteId=bite-1)',
      });
    });

    it('should file a bare report when there is no context', async () => {
      await service.recordNonFatal('Bite details load failed');

      expect(recordException).toHaveBeenCalledWith({
        message: 'Bite details load failed',
      });
    });

    it('should never let the reporting itself throw', async () => {
      recordException.mockRejectedValue(new Error('Crashlytics error'));

      await expect(
        service.recordNonFatal('Bite details load failed'),
      ).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error reporting to Crashlytics:',
        expect.any(Error),
      );
    });
  });

  describe('given the web', () => {
    beforeEach(() => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    });

    it('should note the branch on the console instead', async () => {
      await service.recordNonFatal('Bite details load failed', {
        branch: 'unavailable',
      });

      expect(recordException).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Non-fatal:',
        'Bite details load failed (branch=unavailable)',
      );
    });
  });
});
