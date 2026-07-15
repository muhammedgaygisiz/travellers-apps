import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import type { PublicUser } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService } from 'bite-tribe/api';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { ToastController } from '@ionic/angular';
import { TranslocoService } from '@jsverse/transloco';
import { EmailVerificationService } from '../email-verification.service';

let mockPublicUser$: BehaviorSubject<PublicUser | null>;

class StoreMock {
  publicUser$ = mockPublicUser$.asObservable();
}

const ApiMock = {
  resendEmailVerification: jest.fn(),
};

class AnalyticsMock {
  logEvent = jest.fn();
}

class ToastControllerMock {
  create = jest.fn().mockResolvedValue({ present: jest.fn() });
}

class TranslocoMock {
  translate = jest.fn((key: string) => key);
}

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let analytics: AnalyticsService;
  let toastController: ToastController;

  beforeEach(() => {
    mockPublicUser$ = new BehaviorSubject<PublicUser | null>(null);
    ApiMock.resendEmailVerification.mockReset().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        EmailVerificationService,
        { provide: BiteTribeStoreService, useClass: StoreMock },
        { provide: BiteTribeApiService, useValue: ApiMock },
        { provide: AnalyticsService, useClass: AnalyticsMock },
        { provide: ToastController, useClass: ToastControllerMock },
        { provide: TranslocoService, useClass: TranslocoMock },
      ],
    });

    service = TestBed.inject(EmailVerificationService);
    analytics = TestBed.inject(AnalyticsService);
    toastController = TestBed.inject(ToastController);
  });

  describe('promptVisible', () => {
    it('returns false when no public user is loaded', () => {
      expect(service.promptVisible()).toBe(false);
    });

    it('returns true for unverified users that require verification', () => {
      mockPublicUser$.next({
        emailVerified: false,
        emailVerificationRequired: true,
      } as PublicUser);

      expect(service.promptVisible()).toBe(true);
    });

    it('returns false when verification is already complete', () => {
      mockPublicUser$.next({
        emailVerified: true,
        emailVerificationRequired: true,
      } as PublicUser);

      expect(service.promptVisible()).toBe(false);
    });

    it('returns false when verification is not required', () => {
      mockPublicUser$.next({
        emailVerified: false,
        emailVerificationRequired: false,
      } as PublicUser);

      expect(service.promptVisible()).toBe(false);
    });
  });

  describe('trackPromptShown', () => {
    it('does not log when the prompt is hidden', () => {
      service.trackPromptShown('home');

      expect(analytics.logEvent).not.toHaveBeenCalledWith(
        AnalyticsEvent.EmailVerificationPromptShown,
        expect.anything(),
      );
    });

    it('logs when the prompt is visible', () => {
      mockPublicUser$.next({
        emailVerified: false,
        emailVerificationRequired: true,
      } as PublicUser);

      service.trackPromptShown('settings');

      expect(analytics.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.EmailVerificationPromptShown,
        { surface: 'settings' },
      );
    });
  });

  describe('resend', () => {
    it('logs tapped + succeeded analytics and shows the sent toast', async () => {
      await service.resend('home');

      expect(ApiMock.resendEmailVerification).toHaveBeenCalledTimes(1);
      expect(analytics.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.EmailVerificationResendTapped,
        { surface: 'home' },
      );
      expect(analytics.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.EmailVerificationResendSucceeded,
        { surface: 'home' },
      );
      expect(toastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'verification-email-sent-check-your-inbox',
        }),
      );
    });

    it('logs failed analytics and shows the rate-limited toast', async () => {
      ApiMock.resendEmailVerification.mockRejectedValue({
        message: 'rate_limited',
      });

      await service.resend('profile_edit');

      expect(analytics.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.EmailVerificationResendFailed,
        { surface: 'profile_edit', reason: 'rate_limited' },
      );
      expect(toastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'please-wait-before-requesting-another-verification-email',
        }),
      );
    });

    it('maps already_verified failures to the already-verified toast', async () => {
      ApiMock.resendEmailVerification.mockRejectedValue({
        message: 'already_verified',
      });

      await service.resend('home');

      expect(toastController.create).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'email-already-verified' }),
      );
    });

    it('maps unsupported_provider failures to the not-available toast', async () => {
      ApiMock.resendEmailVerification.mockRejectedValue({
        message: 'unsupported_provider',
      });

      await service.resend('home');

      expect(toastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'email-verification-not-available',
        }),
      );
    });

    it('shows the default error toast for unknown failures', async () => {
      ApiMock.resendEmailVerification.mockRejectedValue(new Error('boom'));

      await service.resend('home');

      expect(toastController.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'verification-email-could-not-be-sent',
        }),
      );
    });
  });
});
