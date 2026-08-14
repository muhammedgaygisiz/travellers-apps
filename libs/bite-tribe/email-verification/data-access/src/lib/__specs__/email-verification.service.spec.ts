import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import type { PublicUser } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService } from 'bite-tribe/api';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { ToastService } from 'toast';
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

class ToastServiceMock {
  present = jest.fn().mockResolvedValue(undefined);
}

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let analytics: AnalyticsService;
  let toast: ToastServiceMock;

  beforeEach(() => {
    mockPublicUser$ = new BehaviorSubject<PublicUser | null>(null);
    ApiMock.resendEmailVerification.mockReset().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        EmailVerificationService,
        { provide: BiteTribeStoreService, useClass: StoreMock },
        { provide: BiteTribeApiService, useValue: ApiMock },
        { provide: AnalyticsService, useClass: AnalyticsMock },
        { provide: ToastService, useClass: ToastServiceMock },
      ],
    });

    service = TestBed.inject(EmailVerificationService);
    analytics = TestBed.inject(AnalyticsService);
    toast = TestBed.inject(ToastService) as unknown as ToastServiceMock;
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
      expect(toast.present).toHaveBeenCalledWith({
        messageKey: 'verification-email-sent-check-your-inbox',
        outcome: 'success',
      });
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
      expect(toast.present).toHaveBeenCalledWith({
        messageKey: 'please-wait-before-requesting-another-verification-email',
        outcome: 'failure',
      });
    });

    it('maps already_verified failures to the already-verified toast', async () => {
      ApiMock.resendEmailVerification.mockRejectedValue({
        message: 'already_verified',
      });

      await service.resend('home');

      expect(toast.present).toHaveBeenCalledWith({
        messageKey: 'email-already-verified',
        outcome: 'failure',
      });
    });

    it('maps unsupported_provider failures to the not-available toast', async () => {
      ApiMock.resendEmailVerification.mockRejectedValue({
        message: 'unsupported_provider',
      });

      await service.resend('home');

      expect(toast.present).toHaveBeenCalledWith({
        messageKey: 'email-verification-not-available',
        outcome: 'failure',
      });
    });

    it('maps send_failed failures to the retryable error toast', async () => {
      ApiMock.resendEmailVerification.mockRejectedValue({
        message: 'send_failed',
      });

      await service.resend('settings');

      expect(analytics.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.EmailVerificationResendFailed,
        { surface: 'settings', reason: 'send_failed' },
      );
      expect(toast.present).toHaveBeenCalledWith({
        messageKey: 'verification-email-could-not-be-sent',
        outcome: 'failure',
      });
    });

    it('shows the default error toast for unknown failures', async () => {
      ApiMock.resendEmailVerification.mockRejectedValue(new Error('boom'));

      await service.resend('home');

      expect(toast.present).toHaveBeenCalledWith({
        messageKey: 'verification-email-could-not-be-sent',
        outcome: 'failure',
      });
    });
  });

  describe('resendRunning', () => {
    it('is false before the first resend', () => {
      expect(service.resendRunning()).toBe(false);
    });

    it('is true while the callable is in flight', async () => {
      let resolveResend: () => void = () => undefined;
      ApiMock.resendEmailVerification.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveResend = resolve;
        }),
      );

      const pending = service.resend('home');
      expect(service.resendRunning()).toBe(true);

      resolveResend();
      await pending;

      expect(service.resendRunning()).toBe(false);
    });

    it('ignores a second tap while a resend is in flight', async () => {
      let resolveResend: () => void = () => undefined;
      ApiMock.resendEmailVerification.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveResend = resolve;
        }),
      );

      const pending = service.resend('home');
      await service.resend('home');

      expect(ApiMock.resendEmailVerification).toHaveBeenCalledTimes(1);
      expect(analytics.logEvent).toHaveBeenCalledTimes(1);
      expect(analytics.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.EmailVerificationResendTapped,
        { surface: 'home' },
      );

      resolveResend();
      await pending;
    });

    it('is released after a failure so the prompt stays actionable', async () => {
      ApiMock.resendEmailVerification.mockRejectedValue(new Error('boom'));

      await service.resend('home');

      expect(service.resendRunning()).toBe(false);

      ApiMock.resendEmailVerification.mockResolvedValue(undefined);
      await service.resend('home');

      expect(ApiMock.resendEmailVerification).toHaveBeenCalledTimes(2);
      expect(toast.present).toHaveBeenLastCalledWith({
        messageKey: 'verification-email-sent-check-your-inbox',
        outcome: 'success',
      });
    });
  });
});
