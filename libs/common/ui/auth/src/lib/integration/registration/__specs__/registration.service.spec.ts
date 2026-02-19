import { RegistrationService } from '../registration.service';
import { TestBed } from '@angular/core/testing';
import { AuthService } from 'ta-firestore';
import { NavController, ToastController } from '@ionic/angular';

const MockedAuthService = {
  registerWithUsernameAndPassword: jest.fn(),
};

const MockedNavController = {
  navigateBack: jest.fn(),
};

const MockedToastController = {
  create: jest.fn().mockResolvedValue({
    present: jest.fn().mockResolvedValue(undefined),
  }),
};

describe(RegistrationService.name, () => {
  let service: RegistrationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: MockedAuthService },
        { provide: NavController, useValue: MockedNavController },
        { provide: ToastController, useValue: MockedToastController },
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
      it('should delegate to auth service and should go back to home screen', async () => {
        await service.register({
          email: 'q@q.de',
          password: '12345678',
        });

        expect(registerWithUsernameAndPasswordSpy).toHaveBeenCalledWith({
          email: 'q@q.de',
          password: '12345678',
        });
        expect(navigateBackSpy).toHaveBeenCalledWith(['/home']);
      });
    });

    describe('given a AuthErrorCodes.EMAIL_EXISTS is thrown', () => {
      let showRegistrationErrorMessageSpy: jest.SpyInstance;

      beforeEach(() => {
        registerWithUsernameAndPasswordSpy.mockImplementation(() => {
          const error: any = new Error('Email already exists');
          error.code = 'auth/email-already-in-use';
          throw error;
        });

        showRegistrationErrorMessageSpy = jest.spyOn(
          service as any,
          'showRegistrationErrorMessage',
        );
      });

      it('should show a generic error message', async () => {
        await service.register({
          email: 'q@q.de',
          password: '12345678',
        });

        expect(showRegistrationErrorMessageSpy).toHaveBeenCalledWith(
          'A error occurred during registration. Please try again.',
        );
      });
    });

    describe('given any other error from AuthErrorCodes is thrown', () => {
      let showRegistrationErrorMessageSpy: jest.SpyInstance;

      beforeEach(() => {
        registerWithUsernameAndPasswordSpy.mockImplementation(() => {
          const error: any = new Error('Some unknown error');
          error.code = 'auth/some-unknown-error';
          error.errorMessage = 'This is an unknown error';
          throw error;
        });

        showRegistrationErrorMessageSpy = jest.spyOn(
          service as any,
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
  });
});
