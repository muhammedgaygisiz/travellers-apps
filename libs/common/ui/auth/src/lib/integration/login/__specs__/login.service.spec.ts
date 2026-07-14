import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { NavController } from '@ionic/angular';
import { provideRouter } from '@angular/router';
import { LoginService } from '../login.service';
import { STORE_SERVICE, StoreService } from 'utils';

describe('LoginService', () => {
  let service: LoginService;
  let navController: NavController;
  let store: StoreService;

  beforeEach(() => {
    const initialState = {};
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState }),
        provideRouter([
          { path: 'registration', redirectTo: '' },
          { path: 'forgot-password', redirectTo: '' },
        ]),
        {
          provide: STORE_SERVICE,
          useValue: {
            login: jest.fn(),
            loginWithGoogleAccount: jest.fn(),
            loginWithAppleAccount: jest.fn(),
            loginWithFacebookAccount: jest.fn(),
            loginFailed: jest.fn(),
          },
        },
      ],
    }).compileComponents();

    service = TestBed.inject(LoginService);
    store = TestBed.inject(STORE_SERVICE);
    navController = TestBed.inject(NavController);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('loginFailed', () => {
    describe('given no store', () => {
      it('should return true', () => {
        const store = service['store'];
        service['store'] = null;

        const result = service.loginFailed();
        expect(result).toBeTruthy();

        service['store'] = store;
      });
    });

    describe('given store', () => {
      it('should call loginFailed from store', () => {
        const result = service.loginFailed();
        expect(result).toBeFalsy();
      });
    });
  });

  describe('login', () => {
    it('should dispatch auth action', () => {
      const loginSpy = jest.spyOn(store, 'login');

      const authCreds = {
        email: 'email',
        password: 'password',
      };
      service.login(authCreds);

      expect(loginSpy).toHaveBeenCalledWith(authCreds);
    });
  });

  describe('gotoSignUp', () => {
    it('should call navigateForward', async () => {
      const navigateForwardSpy = jest.spyOn(navController, 'navigateForward');
      await service.gotoSignUp();

      expect(navigateForwardSpy).toHaveBeenCalledWith(['/registration']);
    });
  });

  describe('gotoForgotPassword', () => {
    it('should call navigateForward with trimmed email query param', async () => {
      const navigateForwardSpy = jest.spyOn(navController, 'navigateForward');

      await service.gotoForgotPassword('  test@example.com  ');

      expect(navigateForwardSpy).toHaveBeenCalledWith(['/forgot-password'], {
        queryParams: { email: 'test@example.com' },
      });
    });

    it('should call navigateForward without query params when email is empty', async () => {
      const navigateForwardSpy = jest.spyOn(navController, 'navigateForward');

      await service.gotoForgotPassword(' ');

      expect(navigateForwardSpy).toHaveBeenCalledWith(
        ['/forgot-password'],
        undefined,
      );
    });
  });

  describe('loginWithGoogleAccount', () => {
    it('should dispatch loginWithGoogleAccount action', () => {
      const loginWithGoogleSpy = jest.spyOn(store, 'loginWithGoogleAccount');

      service.loginWithGoogleAccount();

      expect(loginWithGoogleSpy).toHaveBeenCalled();
    });
  });

  describe('loginWithAppleAccount', () => {
    it('should dispatch loginWithAppleAccount action', () => {
      const loginWithAppleSpy = jest.spyOn(store, 'loginWithAppleAccount');

      service.loginWithAppleAccount();

      expect(loginWithAppleSpy).toHaveBeenCalled();
    });
  });

  describe('when store is not available', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideRouter([{ path: 'registration', redirectTo: '' }]),
          { provide: STORE_SERVICE, useValue: null },
        ],
      }).compileComponents();

      service = TestBed.inject(LoginService);
      navController = TestBed.inject(NavController);
    });

    it('should handle login without error', () => {
      const authCreds = { email: 'email', password: 'password' };
      expect(() => service.login(authCreds)).not.toThrow();
    });

    it('should handle social logins without error', () => {
      expect(() => service.loginWithGoogleAccount()).not.toThrow();
      expect(() => service.loginWithAppleAccount()).not.toThrow();
    });
  });
});
