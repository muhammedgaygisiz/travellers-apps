import { TestBed } from '@angular/core/testing';
import { FirebaseErrorHandlerService } from '../firebase-error-handler.service';
import { FIREBASE_ANALYTICS } from '../provide-firestore-analytics';
import { logEvent } from 'firebase/analytics';
import { Capacitor } from '@capacitor/core';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';

jest.mock('@capacitor/core');
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

  describe('given web platform', () => {
    it('should call logEvent and log error to console', () => {
      service.handleError(testError);

      expect(logEvent).toHaveBeenCalledWith({}, 'exception', {
        description: 'Test error',
        fatal: true,
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Captured error:',
        testError
      );
    });
  });

  describe('given native platform', () => {
    beforeEach(() => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    });

    it('should call logEvent, FirebaseCrashlytics.recordException and log error to console', () => {
      const recordExceptionSpy = jest
        .spyOn(FirebaseCrashlytics, 'recordException')
        .mockResolvedValue();

      service.handleError(testError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Captured error:',
        testError
      );
      expect(recordExceptionSpy).toHaveBeenCalledWith({
        message: 'Test error',
        stacktrace: testError.stack || '',
      });
    });
  });
});
