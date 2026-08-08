import { signal, WritableSignal } from '@angular/core';
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
  let loginPending: WritableSignal<boolean>;

  beforeEach(() => {
    const initialState = {};
    loginPending = signal(false);
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
            loginPending,
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

    // Issue #1273: a tap queued between the click and the pending flag turning
    // on must not start a second sign-in.
    it('should not dispatch while a login is already in flight', () => {
      const loginSpy = jest.spyOn(store, 'login');
      loginPending.set(true);

      service.login({ email: 'email', password: 'password' });

      expect(loginSpy).not.toHaveBeenCalled();
    });
  });

  describe('loginPending', () => {
    it('should follow the store', () => {
      expect(service.loginPending()).toBe(false);

      loginPending.set(true);

      expect(service.loginPending()).toBe(true);
    });

    it('should be false without a store', () => {
      const store = service['store'];
      service['store'] = null;

      expect(service.loginPending()).toBe(false);

      service['store'] = store;
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

    it('should not dispatch while a login is already in flight', () => {
      const loginWithGoogleSpy = jest.spyOn(store, 'loginWithGoogleAccount');
      loginPending.set(true);

      service.loginWithGoogleAccount();

      expect(loginWithGoogleSpy).not.toHaveBeenCalled();
    });
  });

  describe('loginWithAppleAccount', () => {
    it('should dispatch loginWithAppleAccount action', () => {
      const loginWithAppleSpy = jest.spyOn(store, 'loginWithAppleAccount');

      service.loginWithAppleAccount();

      expect(loginWithAppleSpy).toHaveBeenCalled();
    });

    it('should not dispatch while a login is already in flight', () => {
      const loginWithAppleSpy = jest.spyOn(store, 'loginWithAppleAccount');
      loginPending.set(true);

      service.loginWithAppleAccount();

      expect(loginWithAppleSpy).not.toHaveBeenCalled();
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
