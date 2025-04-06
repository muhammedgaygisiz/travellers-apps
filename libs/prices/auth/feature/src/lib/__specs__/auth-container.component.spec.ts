import { AuthContainerComponent } from '../integration/auth-container.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { AuthService } from '../integration/auth.service';
import {
  addNecessaryIcons,
  getIonicConfig,
} from '@travellers-apps/utils-common';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';

addNecessaryIcons();

jest.mock('localization');

describe('AuthContainerComponent', () => {
  let component: AuthContainerComponent;
  let fixture: ComponentFixture<AuthContainerComponent>;
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        provideMockStore({}),
        provideRouter([{ path: 'registration', redirectTo: '' }]),
      ],
    }).compileComponents();

    service = TestBed.inject(AuthService);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AuthContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('when onSignupWithGoogle is called', () => {
    it('should call loginWithGoogleAccount in auth service', () => {
      const loginWithGoogleAccountMock = jest.spyOn(
        service,
        'loginWithGoogleAccount'
      );

      component.onSignupWithGoogle();

      expect(loginWithGoogleAccountMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('should call login in service', () => {
      const loginSpy = jest.spyOn(service, 'login');

      const authCreds = {
        email: 'email',
        password: 'password',
      };

      component.login(authCreds);

      expect(loginSpy).toHaveBeenCalledWith(authCreds);
    });
  });

  describe('gotoSignup', () => {
    it('should call gotoSignUp in service', async () => {
      const gotoSignUpSpy = jest.spyOn(service, 'gotoSignUp');

      await component.gotoSignup();

      expect(gotoSignUpSpy).toHaveBeenCalledTimes(1);
    });
  });
});
