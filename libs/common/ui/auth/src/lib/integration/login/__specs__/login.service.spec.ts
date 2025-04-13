import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { NavController } from '@ionic/angular';
import { provideRouter } from '@angular/router';
import { LoginService } from '../login.service';
import { STORE_SERVICE, StoreService } from 'utils';

jest.mock('localization');

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
            login: jest.fn(),
            loginWithGoogleAccount: jest.fn(),
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

  describe('loginWithGoogleAccount', () => {
    it('should dispatch loginWithGoogleAccount action', () => {
      const loginWithGoogleSpy = jest.spyOn(store, 'loginWithGoogleAccount');

      service.loginWithGoogleAccount();

      expect(loginWithGoogleSpy).toHaveBeenCalled();
    });
  });
});
