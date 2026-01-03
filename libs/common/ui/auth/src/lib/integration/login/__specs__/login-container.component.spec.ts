import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LoginContainerComponent } from '../login-container.component';
import { LoginService } from '../login.service';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { addIcons } from 'ionicons';
import { logoApple, logoFacebook, logoGoogle } from 'ionicons/icons';

vi.mock('localization');
addNecessaryIcons();

describe('LoginContainerComponent', () => {
  let component: LoginContainerComponent;
  let fixture: ComponentFixture<LoginContainerComponent>;
  let mockLoginService: any;

  beforeEach(() => {
    mockLoginService = {
      loginFailed: signal(false) as unknown as any,
      login: vi.fn(),
      gotoSignUp: vi.fn(),
      loginWithGoogleAccount: vi.fn(),
      loginWithAppleAccount: vi.fn(),
      loginWithFacebookAccount: vi.fn(),
    } as any;

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

  it('should call login on service when login is called', () => {
    const credentials = { email: 'test@test.com', password: 'password' };
    component.login(credentials);
    expect(mockLoginService.login).toHaveBeenCalledWith(credentials);
  });

  it('should not call login on service when service is not given', () => {
    const credentials = { email: 'test@test.com', password: 'password' };
    const loginService = component['loginService'];
    (component as any)['loginService'] = null;

    component.login(credentials);
    expect(mockLoginService.login).not.toHaveBeenCalled();

    (component as any)['loginService'] = loginService;
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

  it('should handle optional service injection', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    }).compileComponents();

    const fixtureWithoutService = TestBed.createComponent(
      LoginContainerComponent,
    );
    const componentWithoutService = fixtureWithoutService.componentInstance;
    (componentWithoutService as any)['loginService'] = null;

    expect(componentWithoutService.loginFailed()).toBeFalsy();
  });
});
