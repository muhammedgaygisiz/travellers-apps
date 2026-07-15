import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LoginContainerComponent } from '../login-container.component';
import { LoginService } from '../login.service';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { addIcons } from 'ionicons';
import { logoApple, logoFacebook, logoGoogle } from 'ionicons/icons';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('LoginContainerComponent', () => {
  let component: LoginContainerComponent;
  let fixture: ComponentFixture<LoginContainerComponent>;
  let mockLoginService: jest.Mocked<LoginService>;

  beforeEach(() => {
    mockLoginService = {
      loginFailed: signal(false) as unknown as any,
      login: jest.fn(),
      gotoSignUp: jest.fn(),
      gotoForgotPassword: jest.fn(),
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
        { provide: TranslocoService, useValue: MockTranslocoService },
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

  it('should call gotoForgotPassword on service when gotoForgotPassword is called', async () => {
    await component.gotoForgotPassword('test@example.com');
    expect(mockLoginService.gotoForgotPassword).toHaveBeenCalledWith(
      'test@example.com',
    );
  });

  it('should call loginWithGoogleAccount on service when onLoginWithGoogle is called', () => {
    component.onLoginWithGoogle();
    expect(mockLoginService.loginWithGoogleAccount).toHaveBeenCalled();
  });

  it('should call loginWithAppleAccount on service when onLoginWithApple is called', () => {
    component.onLoginWithApple();
    expect(mockLoginService.loginWithAppleAccount).toHaveBeenCalled();
  });

  it('should handle optional service injection', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    const fixtureWithoutService = TestBed.createComponent(
      LoginContainerComponent,
    );
    const componentWithoutService = fixtureWithoutService.componentInstance;
    (componentWithoutService as any)['loginService'] = null;

    expect(componentWithoutService.loginFailed()).toBeFalsy();
  });
});
