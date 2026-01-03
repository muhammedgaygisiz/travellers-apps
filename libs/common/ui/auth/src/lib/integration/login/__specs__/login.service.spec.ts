import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { NavController } from '@ionic/angular';
import { provideRouter } from '@angular/router';
import { LoginService } from '../login.service';
import { STORE_SERVICE, StoreService } from 'utils';

vi.mock('localization');

describe('LoginService', () => {
  let service: LoginService;
  let navController: NavController;
  let store: StoreService;

  beforeEach(() => {
    const initialState = {};
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState }),
        provideRouter([{ path: 'registration', redirectTo: '' }]),
        {
          provide: STORE_SERVICE,
          useValue: {
            login: vi.fn(),
            loginWithGoogleAccount: vi.fn(),
            loginWithAppleAccount: vi.fn(),
            loginWithFacebookAccount: vi.fn(),
            loginFailed: vi.fn(),
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
      const loginSpy = vi.spyOn(store, 'login');

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
      const navigateForwardSpy = vi.spyOn(navController, 'navigateForward');
      await service.gotoSignUp();

      expect(navigateForwardSpy).toHaveBeenCalledWith(['/registration']);
    });
  });

  describe('loginWithGoogleAccount', () => {
    it('should dispatch loginWithGoogleAccount action', () => {
      const loginWithGoogleSpy = vi.spyOn(store, 'loginWithGoogleAccount');

      service.loginWithGoogleAccount();

      expect(loginWithGoogleSpy).toHaveBeenCalled();
    });
  });

  describe('loginWithAppleAccount', () => {
    it('should dispatch loginWithAppleAccount action', () => {
      const loginWithAppleSpy = vi.spyOn(store, 'loginWithAppleAccount');

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
