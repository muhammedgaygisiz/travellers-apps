import { ComponentFixture, TestBed } from '@angular/core/testing';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { LoginContainerComponent } from '../login-container.component';
import { LoginService } from '../login.service';
import { signal } from '@angular/core';

addNecessaryIcons();

jest.mock('localization');

describe('LoginContainerComponent', () => {
  let component: LoginContainerComponent;
  let fixture: ComponentFixture<LoginContainerComponent>;
  let service: LoginService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        {
          provide: LoginService,
          useValue: {
            loginFailed: signal(false),
            loginWithGoogleAccount: jest.fn(),
            login: jest.fn(),
            gotoSignUp: jest.fn(),
          },
        },
      ],
    });

    service = TestBed.inject(LoginService);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginContainerComponent);
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
    it('should call auth in service', () => {
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
