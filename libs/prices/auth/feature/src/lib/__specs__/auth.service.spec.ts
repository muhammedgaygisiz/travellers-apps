import { AuthService } from '../integration/auth.service';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { fromAuth } from '@travellers-apps/prices/store/feature';
import { NavController } from '@ionic/angular';
import { provideRouter } from '@angular/router';

jest.mock('localization');

describe('AuthService', () => {
  let service: AuthService;
  let store: MockStore;
  let navController: NavController;

  beforeEach(() => {
    const initialState = {};
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState }),
        provideRouter([{ path: 'registration', redirectTo: '' }]),
      ],
    }).compileComponents();

    service = TestBed.inject(AuthService);
    store = TestBed.inject(MockStore);
    navController = TestBed.inject(NavController);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should dispatch login action', () => {
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      const authCreds = {
        email: 'email',
        password: 'password',
      };
      service.login(authCreds);

      expect(dispatchSpy).toHaveBeenCalledWith(fromAuth.login({ authCreds }));
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
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      service.loginWithGoogleAccount();

      expect(dispatchSpy).toHaveBeenCalledWith(
        fromAuth.loginWithGoogleAccount()
      );
    });
  });
});
