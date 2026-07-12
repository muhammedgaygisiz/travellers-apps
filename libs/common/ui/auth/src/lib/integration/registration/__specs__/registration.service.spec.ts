import { RegistrationService } from '../registration.service';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { AnalyticsEvent, AnalyticsService, AuthService } from 'ta-firestore';
import { NavController, ToastController } from '@ionic/angular';

const translations: Record<string, string> = {
  ok: 'OK',
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

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: MockedAuthService },
        { provide: AnalyticsService, useValue: MockedAnalyticsService },
        { provide: NavController, useValue: MockedNavController },
        { provide: ToastController, useValue: MockedToastController },
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
  });
});
