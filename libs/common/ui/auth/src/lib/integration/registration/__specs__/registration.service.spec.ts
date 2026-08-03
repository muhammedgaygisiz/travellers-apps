import { RegistrationService } from '../registration.service';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { AnalyticsEvent, AnalyticsService, AuthService } from 'ta-firestore';
import {
  LoadingController,
  NavController,
  ToastController,
} from '@ionic/angular/standalone';

const translations: Record<string, string> = {
  ok: 'OK',
  'registration-in-progress': 'Creating your account...',
  'registration-timeout-try-again':
    'Registration is taking longer than expected. Please check your connection and try again. If your account was created, sign in instead.',
  'registration-error-try-again':
    'An error occurred during registration. Please try again.',
  'registration-success-check-your-email-to-verify-account':
    'Registration successful! Please check your email to verify your account.',
  'registration-unknown-error-try-again':
    'An unknown error occurred during registration. Please try again.',
};

const MockedAuthService = {
  registerWithUsernameAndPassword: jest.fn(),
  sendEmailVerification: jest.fn(),
};

const MockedNavController = {
  navigateBack: jest.fn(),
};

const MockedAnalyticsService = {
  logEvent: jest.fn(),
};

const MockedToastController = {
  create: jest.fn().mockResolvedValue({
    present: jest.fn().mockResolvedValue(undefined),
  }),
};

const loadingOverlay = {
  present: jest.fn().mockResolvedValue(undefined),
  dismiss: jest.fn().mockResolvedValue(undefined),
};

const MockedLoadingController = {
  create: jest.fn().mockResolvedValue(loadingOverlay),
};

const MockedTranslocoService = {
  translate: jest.fn(
    (key: string): string => translations[key] ?? `missing-translation:${key}`,
  ),
};

type RegistrationServiceWithPrivateMethods = RegistrationService & {
  showRegistrationErrorMessage(message: string): Promise<void>;
};

describe(RegistrationService.name, () => {
  let service: RegistrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    MockedAuthService.registerWithUsernameAndPassword.mockResolvedValue(
      undefined,
    );
    MockedAuthService.sendEmailVerification.mockResolvedValue(undefined);
    MockedNavController.navigateBack.mockResolvedValue(true);
    MockedLoadingController.create.mockResolvedValue(loadingOverlay);
    MockedToastController.create.mockResolvedValue({
      present: jest.fn().mockResolvedValue(undefined),
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: MockedAuthService },
        { provide: AnalyticsService, useValue: MockedAnalyticsService },
        { provide: NavController, useValue: MockedNavController },
        { provide: ToastController, useValue: MockedToastController },
        { provide: LoadingController, useValue: MockedLoadingController },
        { provide: TranslocoService, useValue: MockedTranslocoService },
      ],
    });
    service = TestBed.inject(RegistrationService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('register', () => {
    let registerWithUsernameAndPasswordSpy: jest.SpyInstance;
    let navigateBackSpy: jest.SpyInstance;

    beforeEach(() => {
      registerWithUsernameAndPasswordSpy = jest.spyOn(
        MockedAuthService,
        'registerWithUsernameAndPassword',
      );
      navigateBackSpy = jest.spyOn(MockedNavController, 'navigateBack');
    });

    describe('given a successful registration', () => {
      let sendEmailVerificationSpy: jest.SpyInstance;

      beforeEach(() => {
        sendEmailVerificationSpy = jest.spyOn(
          MockedAuthService,
          'sendEmailVerification',
        );
      });

      it('should delegate to auth service, send verification email and navigate to login', async () => {
        await service.register({
          email: 'q@q.de',
          password: '12345678',
        });

        expect(registerWithUsernameAndPasswordSpy).toHaveBeenCalledWith({
          email: 'q@q.de',
          password: '12345678',
        });
        expect(sendEmailVerificationSpy).toHaveBeenCalled();
        expect(navigateBackSpy).toHaveBeenCalledWith(['/home']);
      });

      it('should log the sign_up analytics event', async () => {
        await service.register({
          email: 'q@q.de',
          password: '12345678',
        });

        expect(MockedAnalyticsService.logEvent).toHaveBeenCalledWith(
          AnalyticsEvent.SignUp,
          { method: 'password' },
        );
      });
    });

    describe('given a AuthErrorCodes.EMAIL_EXISTS is thrown', () => {
      let showRegistrationErrorMessageSpy: jest.SpyInstance;

      beforeEach(() => {
        registerWithUsernameAndPasswordSpy.mockImplementation(() => {
          throw Object.assign(new Error('Email already exists'), {
            code: 'auth/email-already-in-use',
          }) as Error & { code: string };
        });

        showRegistrationErrorMessageSpy = jest.spyOn(
          service as RegistrationServiceWithPrivateMethods,
          'showRegistrationErrorMessage',
        );
      });

      it('should show a generic error message', async () => {
        await service.register({
          email: 'q@q.de',
          password: '12345678',
        });

        expect(showRegistrationErrorMessageSpy).toHaveBeenCalledWith(
          'An error occurred during registration. Please try again.',
        );
      });
    });

    describe('given any other error from AuthErrorCodes is thrown', () => {
      let showRegistrationErrorMessageSpy: jest.SpyInstance;

      beforeEach(() => {
        registerWithUsernameAndPasswordSpy.mockImplementation(() => {
          throw Object.assign(new Error('Some unknown error'), {
            code: 'auth/some-unknown-error',
            errorMessage: 'This is an unknown error',
          }) as Error & { code: string; errorMessage: string };
        });

        showRegistrationErrorMessageSpy = jest.spyOn(
          service as RegistrationServiceWithPrivateMethods,
          'showRegistrationErrorMessage',
        );
      });

      it('should show the error message from the thrown error', async () => {
        await service.register({
          email: 'q@q.de',
          password: '12345678',
        });

        expect(showRegistrationErrorMessageSpy).toHaveBeenCalledWith(
          'This is an unknown error',
        );
      });
    });

    describe('given an unknown error without error message is thrown', () => {
      let showRegistrationErrorMessageSpy: jest.SpyInstance;

      beforeEach(() => {
        registerWithUsernameAndPasswordSpy.mockImplementation(() => {
          const error = new Error('Some unknown error');

          Object.assign(error, {
            code: 'auth/some-unknown-error',
          });

          throw error;
        });

        showRegistrationErrorMessageSpy = jest.spyOn(
          service as never,
          'showRegistrationErrorMessage' as never,
        );
      });

      it('should show the translated fallback error message', async () => {
        await service.register({
          email: 'q@q.de',
          password: '12345678',
        });

        expect(showRegistrationErrorMessageSpy).toHaveBeenCalledWith(
          'An unknown error occurred during registration. Please try again.',
        );
      });
    });

    // Issue #1185: the sign-up, verification mail and onboarding gate are three
    // round-trips, and without a blocking overlay the form looked untouched.
    describe('given the transition into onboarding is slow', () => {
      let resolveRegistration: (() => void) | undefined;

      /**
       * Lets the overlay creation settle so registration is parked on the
       * pending auth call, without completing it.
       */
      const settleOverlay = async (): Promise<void> => {
        for (let tick = 0; tick < 50; tick++) {
          if (resolveRegistration) {
            return;
          }

          await Promise.resolve();
        }
      };

      beforeEach(() => {
        resolveRegistration = undefined;
        registerWithUsernameAndPasswordSpy.mockImplementation(
          () =>
            new Promise<void>((resolve) => {
              resolveRegistration = resolve;
            }),
        );
      });

      it('should present a non-dismissible loading overlay before the first round-trip', async () => {
        const pending = service.register({
          email: 'q@q.de',
          password: '12345678',
        });
        await settleOverlay();

        expect(MockedLoadingController.create).toHaveBeenCalledWith({
          message: 'Creating your account...',
          backdropDismiss: false,
        });
        expect(loadingOverlay.present).toHaveBeenCalled();
        expect(loadingOverlay.present.mock.invocationCallOrder[0]).toBeLessThan(
          registerWithUsernameAndPasswordSpy.mock.invocationCallOrder[0],
        );

        resolveRegistration?.();
        await pending;
      });

      it('should report progress until the navigation into onboarding resolves', async () => {
        const pending = service.register({
          email: 'q@q.de',
          password: '12345678',
        });
        await settleOverlay();

        expect(service.registering()).toBe(true);
        expect(loadingOverlay.dismiss).not.toHaveBeenCalled();

        resolveRegistration?.();
        await pending;

        expect(navigateBackSpy).toHaveBeenCalledWith(['/home']);
        expect(loadingOverlay.dismiss).toHaveBeenCalled();
        expect(
          loadingOverlay.dismiss.mock.invocationCallOrder[0],
        ).toBeGreaterThan(navigateBackSpy.mock.invocationCallOrder[0]);
        expect(service.registering()).toBe(false);
      });

      it('should ignore a second submit while registration is in flight', async () => {
        const pending = service.register({
          email: 'q@q.de',
          password: '12345678',
        });
        await settleOverlay();

        await service.register({ email: 'q@q.de', password: '12345678' });

        expect(registerWithUsernameAndPasswordSpy).toHaveBeenCalledTimes(1);
        expect(MockedLoadingController.create).toHaveBeenCalledTimes(1);

        resolveRegistration?.();
        await pending;

        expect(navigateBackSpy).toHaveBeenCalledTimes(1);
      });
    });

    // Issue #1219: on iOS the overlay controller was resolved from the lazy
    // `@ionic/angular` entry point, so `create()` waited forever on an
    // `ion-loading` element that the standalone build never defines. The whole
    // registration was parked on that promise: no Auth user, no error, no way
    // out. Nothing in this flow may depend on a promise that never settles.
    describe('given a dependency never settles', () => {
      const neverSettles = <T>(): Promise<T> => new Promise<T>(() => undefined);

      /** Lets the flow run up to the call that hangs before timers advance. */
      const settleMicrotasks = async (): Promise<void> => {
        for (let tick = 0; tick < 5; tick++) {
          await Promise.resolve();
        }
      };

      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should register anyway when the loading overlay never appears', async () => {
        MockedLoadingController.create.mockReturnValue(neverSettles());

        const pending = service.register({
          email: 'q@q.de',
          password: '12345678',
        });
        await settleMicrotasks();
        await jest.advanceTimersByTimeAsync(2_000);
        await pending;

        expect(registerWithUsernameAndPasswordSpy).toHaveBeenCalledWith({
          email: 'q@q.de',
          password: '12345678',
        });
        expect(navigateBackSpy).toHaveBeenCalledWith(['/home']);
        expect(service.registering()).toBe(false);
      });

      it('should end the pending state with an actionable message when the auth round-trip never settles', async () => {
        registerWithUsernameAndPasswordSpy.mockImplementation(() =>
          neverSettles(),
        );

        const pending = service.register({
          email: 'q@q.de',
          password: '12345678',
        });
        await settleMicrotasks();
        await jest.advanceTimersByTimeAsync(30_000);
        await pending;

        expect(MockedToastController.create).toHaveBeenCalledWith(
          expect.objectContaining({
            message: translations['registration-timeout-try-again'],
          }),
        );
        expect(loadingOverlay.dismiss).toHaveBeenCalled();
        expect(navigateBackSpy).not.toHaveBeenCalled();
        expect(service.registering()).toBe(false);
      });

      it('should allow a retry after a timed out attempt', async () => {
        registerWithUsernameAndPasswordSpy.mockImplementation(() =>
          neverSettles(),
        );

        const pending = service.register({
          email: 'q@q.de',
          password: '12345678',
        });
        await settleMicrotasks();
        await jest.advanceTimersByTimeAsync(30_000);
        await pending;

        registerWithUsernameAndPasswordSpy.mockResolvedValue(undefined);
        await service.register({ email: 'q@q.de', password: '12345678' });

        expect(registerWithUsernameAndPasswordSpy).toHaveBeenCalledTimes(2);
        expect(navigateBackSpy).toHaveBeenCalledWith(['/home']);
      });

      it('should release the form when the feedback toast never appears', async () => {
        registerWithUsernameAndPasswordSpy.mockRejectedValue(
          Object.assign(new Error('Network request failed'), {
            code: 'auth/network-request-failed',
            errorMessage: 'Network request failed',
          }),
        );
        MockedToastController.create.mockReturnValue(neverSettles());

        const pending = service.register({
          email: 'q@q.de',
          password: '12345678',
        });
        await settleMicrotasks();
        await jest.advanceTimersByTimeAsync(2_000);
        await pending;

        expect(loadingOverlay.dismiss).toHaveBeenCalled();
        expect(service.registering()).toBe(false);
      });
    });

    describe('given registration fails', () => {
      beforeEach(() => {
        registerWithUsernameAndPasswordSpy.mockRejectedValue(
          Object.assign(new Error('Email already exists'), {
            code: 'auth/email-already-in-use',
          }),
        );
      });

      it('should dismiss the loading overlay and leave the form usable', async () => {
        await service.register({
          email: 'q@q.de',
          password: '12345678',
        });

        expect(loadingOverlay.dismiss).toHaveBeenCalled();
        expect(service.registering()).toBe(false);
        expect(navigateBackSpy).not.toHaveBeenCalled();
      });

      it('should allow a retry after the failure', async () => {
        await service.register({ email: 'q@q.de', password: '12345678' });
        await service.register({ email: 'q@q.de', password: '12345678' });

        expect(registerWithUsernameAndPasswordSpy).toHaveBeenCalledTimes(2);
      });
    });
  });
});
