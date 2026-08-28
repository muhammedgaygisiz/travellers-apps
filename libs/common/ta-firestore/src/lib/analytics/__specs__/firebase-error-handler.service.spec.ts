import { TestBed } from '@angular/core/testing';
import { FirebaseErrorHandlerService } from '../firebase-error-handler.service';
import { FIREBASE_ANALYTICS } from '../provide-firestore-analytics';
import { logEvent } from 'firebase/analytics';
import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';

jest.mock('@capacitor/core');
jest.mock('@capacitor-firebase/analytics', () => {
  return {
    FirebaseAnalytics: {
      logEvent: jest.fn(),
    },
  };
});
jest.mock('firebase/analytics', () => {
  return {
    logEvent: jest.fn(),
  };
});
jest.mock('@capacitor-firebase/crashlytics', () => {
  return {
    FirebaseCrashlytics: {
      recordException: jest.fn(),
    },
  };
});

describe('FirebaseErrorHandlerService', (): void => {
  let service: FirebaseErrorHandlerService;
  const testError = new Error('Test error');
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

  beforeEach(() => {
    // Both analytics transports are asserted as *not* used on the platform they
    // do not belong to, so their call history must not leak between tests.
    jest.mocked(logEvent).mockClear();
    jest.mocked(FirebaseAnalytics.logEvent).mockClear();
    jest.mocked(FirebaseAnalytics.logEvent).mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        FirebaseErrorHandlerService,
        { provide: FIREBASE_ANALYTICS, useValue: {} },
      ],
    });

    service = TestBed.inject(FirebaseErrorHandlerService);
  });

  afterEach(() => {
    consoleErrorSpy.mockReset();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('given different error objects', () => {
    describe('given obj without message', () => {
      it('should handle error with toString', async () => {
        const objError = { toString: (): string => 'Object error' };
        await service.handleError(objError);

        expect(logEvent).toHaveBeenCalledWith({}, 'exception', {
          description: 'Object error',
          fatal: true,
        });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Captured error:',
          objError,
        );
      });
    });

    describe('given undefined', () => {
      it('should handle error as Unknown error', async () => {
        const objError = undefined;
        await service.handleError(objError);

        expect(logEvent).toHaveBeenCalledWith({}, 'exception', {
          description: 'Unknown error',
          fatal: true,
        });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Captured error:',
          objError,
        );
      });
    });

    describe('given null', () => {
      it('should handle error as Unknown error', async () => {
        const objError = null;
        await service.handleError(objError);

        expect(logEvent).toHaveBeenCalledWith({}, 'exception', {
          description: 'Unknown error',
          fatal: true,
        });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Captured error:',
          objError,
        );
      });
    });
  });

  describe('given web platform', () => {
    it('should call logEvent and log error to console', async () => {
      await service.handleError(testError);

      expect(logEvent).toHaveBeenCalledWith({}, 'exception', {
        description: 'Test error',
        fatal: true,
      });
      expect(FirebaseAnalytics.logEvent).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Captured error:',
        testError,
      );
    });

    it('should still report the error when analytics is unsupported', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          FirebaseErrorHandlerService,
          { provide: FIREBASE_ANALYTICS, useValue: null },
        ],
      });

      await TestBed.inject(FirebaseErrorHandlerService).handleError(testError);

      expect(logEvent).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Captured error:',
        testError,
      );
    });
  });

  describe('given native platform', () => {
    beforeEach(() => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    });

    // Every other analytics call on a native platform goes through the
    // Capacitor plugin, which is the native SDK there. The exception event was
    // the one that did not, so it reported on a different measurement path
    // than the events from the same device (issue #1387).
    it('should emit the exception event through the native plugin', async () => {
      jest.spyOn(FirebaseCrashlytics, 'recordException').mockResolvedValue();

      await service.handleError(testError);

      expect(FirebaseAnalytics.logEvent).toHaveBeenCalledWith({
        name: 'exception',
        params: { description: 'Test error', fatal: true },
      });
      expect(logEvent).not.toHaveBeenCalled();
    });

    it('should keep reporting the error when the exception event fails', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      jest
        .mocked(FirebaseAnalytics.logEvent)
        .mockRejectedValue(new Error('Analytics error'));
      jest.spyOn(FirebaseCrashlytics, 'recordException').mockResolvedValue();

      await service.handleError(testError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Captured error:',
        testError,
      );

      await Promise.resolve();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to log the exception event:',
        expect.any(Error),
      );

      consoleWarnSpy.mockRestore();
    });

    it('should log error on exception in recordException', async () => {
      jest
        .spyOn(FirebaseCrashlytics, 'recordException')
        .mockRejectedValue(new Error('Crashlytics error'));

      await service.handleError(testError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error reporting to Crashlytics:',
        expect.any(Error),
      );
    });

    it('should call logEvent, FirebaseCrashlytics.recordException and log error to console', async () => {
      const recordExceptionSpy = jest
        .spyOn(FirebaseCrashlytics, 'recordException')
        .mockResolvedValue();

      await service.handleError(testError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Captured error:',
        testError,
      );
      expect(recordExceptionSpy).toHaveBeenCalledWith({
        message: 'Test error',
        stacktrace: testError.stack || '',
      });
    });
  });

  describe('given no message in error', () => {
    it('should record exception with fallback message', () => {
      const errorWithoutMessage = { stack: 'stack trace' };
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      const recordExceptionSpy = jest
        .spyOn(FirebaseCrashlytics, 'recordException')
        .mockResolvedValue();

      service.handleError(errorWithoutMessage);

      expect(recordExceptionSpy).toHaveBeenCalledWith({
        message: 'Unknown Angular error',
        stacktrace: 'stack trace',
      });
    });
  });

  describe('given no stack in error', () => {
    it('should use empty string as stacktrace', () => {
      const errorWithoutStack = { message: 'Some error' };
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      const recordExceptionSpy = jest
        .spyOn(FirebaseCrashlytics, 'recordException')
        .mockResolvedValue();

      service.handleError(errorWithoutStack);

      expect(recordExceptionSpy).toHaveBeenCalledWith({
        message: 'Some error',
        stacktrace: '',
      });
    });
  });
});
