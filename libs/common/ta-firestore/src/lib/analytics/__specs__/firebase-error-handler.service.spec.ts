import { TestBed } from '@angular/core/testing';
import { FirebaseErrorHandlerService } from '../firebase-error-handler.service';
import { FIREBASE_ANALYTICS } from '../provide-firestore-analytics';
import { logEvent } from 'firebase/analytics';
import { Capacitor } from '@capacitor/core';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { vi } from 'vitest';

vi.mock('@capacitor/core');
vi.mock('firebase/analytics', () => {
  return {
    logEvent: vi.fn(),
  };
});
vi.mock('@capacitor-firebase/crashlytics', () => {
  return {
    FirebaseCrashlytics: {
      recordException: vi.fn(),
    },
  };
});

describe('FirebaseErrorHandlerService', (): void => {
  let service: FirebaseErrorHandlerService;
  const testError = new Error('Test error');
  const consoleErrorSpy = vi
    .spyOn(console, 'error')
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    .mockImplementation(() => {});

  beforeEach(() => {
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
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Captured error:',
        testError,
      );
    });
  });

  describe('given native platform', () => {
    beforeEach(() => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    });

    it('should log error on exception in recordException', async () => {
      vi.spyOn(FirebaseCrashlytics, 'recordException').mockRejectedValue(
        new Error('Crashlytics error'),
      );

      await service.handleError(testError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error reporting to Crashlytics:',
        expect.any(Error),
      );
    });

    it('should call logEvent, FirebaseCrashlytics.recordException and log error to console', async () => {
      const recordExceptionSpy = vi
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
});
