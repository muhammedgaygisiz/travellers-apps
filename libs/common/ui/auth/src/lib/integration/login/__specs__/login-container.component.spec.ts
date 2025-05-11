import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LoginContainerComponent } from '../login-container.component';
import { LoginService } from '../login.service';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { addIcons } from 'ionicons';
import { logoApple, logoFacebook, logoGoogle } from 'ionicons/icons';

describe('LoginContainerComponent', () => {
  let component: LoginContainerComponent;
  let fixture: ComponentFixture<LoginContainerComponent>;
  let mockLoginService: jest.Mocked<LoginService>;

  beforeEach(() => {
    mockLoginService = {
      loginFailed: signal(false) as unknown as any,
      login: jest.fn(),
      gotoSignUp: jest.fn(),
      loginWithGoogleAccount: jest.fn(),
      loginWithAppleAccount: jest.fn(),
      loginWithFacebookAccount: jest.fn(),
    } as unknown as jest.Mocked<LoginService>;

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        {
          provide: LoginService,
          useValue: mockLoginService,
        },
      ],
    }).compileComponents();

    addIcons({
      logoGoogle,
      logoApple,
      logoFacebook,
    });

    fixture = TestBed.createComponent(LoginContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with loginFailed as false', () => {
    expect(component.loginFailed()).toBeFalsy();
  });

  it('should reflect changes in loginFailed signal', () => {
    mockLoginService.loginFailed.set(true);
    expect(component.loginFailed()).toBeTruthy();
  });

  it('should call login on service when login is called', () => {
    const credentials = { email: 'test@test.com', password: 'password' };
    component.login(credentials);
    expect(mockLoginService.login).toHaveBeenCalledWith(credentials);
  });

  it('should not call login on service when service is not given', () => {
    const credentials = { email: 'test@test.com', password: 'password' };
    const loginService = component['loginService'];
    component['loginService'] = null;

    component.login(credentials);
    expect(mockLoginService.login).not.toHaveBeenCalled();

    component['loginService'] = loginService;
  });

  it('should call gotoSignUp on service when gotoSignup is called', async () => {
    await component.gotoSignup();
    expect(mockLoginService.gotoSignUp).toHaveBeenCalled();
  });

  it('should call loginWithGoogleAccount on service when onSignupWithGoogle is called', () => {
    component.onSignupWithGoogle();
    expect(mockLoginService.loginWithGoogleAccount).toHaveBeenCalled();
  });

  it('should call loginWithAppleAccount on service when onSignupWithApple is called', () => {
    component.onSignupWithApple();
    expect(mockLoginService.loginWithAppleAccount).toHaveBeenCalled();
  });

  it('should call loginWithFacebookAccount on service when onSignupWithFacebook is called', () => {
    component.onSignupWithFacebook();
    expect(mockLoginService.loginWithFacebookAccount).toHaveBeenCalled();
  });

  it('should handle optional service injection', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    }).compileComponents();

    const fixtureWithoutService = TestBed.createComponent(
      LoginContainerComponent
    );
    const componentWithoutService = fixtureWithoutService.componentInstance;
    componentWithoutService['loginService'] = null;

    expect(componentWithoutService.loginFailed()).toBeFalsy();
  });
});
