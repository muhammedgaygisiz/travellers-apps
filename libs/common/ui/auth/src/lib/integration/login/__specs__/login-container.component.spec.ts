import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { LoginContainerComponent } from '../login-container.component';
import { LoginService } from '../login.service';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { addIcons } from 'ionicons';
import { logoApple, logoFacebook, logoGoogle } from 'ionicons/icons';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { provideRouter, Routes } from '@angular/router';

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
  let loginPending: WritableSignal<boolean>;

  beforeEach(() => {
    loginPending = signal(false);
    mockLoginService = {
      loginFailed: signal(false) as unknown as LoginService['loginFailed'],
      loginPending: loginPending as unknown as LoginService['loginPending'],
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

  it('should forward the pending state from the service', () => {
    expect(component.pending()).toBe(false);

    loginPending.set(true);

    expect(component.pending()).toBe(true);
  });

  it('should call login on service when login is called', () => {
    const credentials = { email: 'test@test.com', password: 'password' };
    component.login(credentials);
    expect(mockLoginService.login).toHaveBeenCalledWith(credentials);
  });

  it('should not call login on service when service is not given', () => {
    const credentials = { email: 'test@test.com', password: 'password' };
    const loginService = component['loginService'];
    (component as unknown as { loginService: LoginService | null })[
      'loginService'
    ] = null;

    component.login(credentials);
    expect(mockLoginService.login).not.toHaveBeenCalled();

    (component as unknown as { loginService: LoginService | null })[
      'loginService'
    ] = loginService;
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
    (
      componentWithoutService as unknown as {
        loginService: LoginService | null;
      }
    )['loginService'] = null;

    expect(componentWithoutService.loginFailed()).toBeFalsy();
    expect(componentWithoutService.pending()).toBeFalsy();
  });
});

/**
 * The Sign Up button follows the routing, not a flag of its own.
 *
 * `withAuthRoutes({ registration: false })` removes the route; the login page
 * has to stop advertising it without anyone remembering to turn off a second
 * switch. Both directions are asserted because a button that is always hidden
 * would pass a one-sided test (issue #1469).
 */
describe('LoginContainerComponent sign-up offer', () => {
  let fixture: ComponentFixture<LoginContainerComponent>;

  const build = (routes: Routes): LoginContainerComponent => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        provideRouter(routes),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginContainerComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  const signUpButton = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('[data-testid="signup"]');

  it('offers Sign Up when a registration route exists', () => {
    const component = build([
      { path: 'login', children: [] },
      { path: 'registration', children: [] },
    ]);

    expect(component.showSignUp).toBe(true);
  });

  it('hides Sign Up when the app dropped the registration route', () => {
    const component = build([
      { path: 'login', children: [] },
      { path: 'forgot-password', children: [] },
    ]);

    expect(component.showSignUp).toBe(false);
  });

  it('renders the button when registration is routed', () => {
    build([{ path: 'registration', children: [] }]);

    expect(signUpButton()).not.toBeNull();
  });

  it('renders no button at all when it is not', () => {
    build([{ path: 'login', children: [] }]);

    expect(signUpButton()).toBeNull();
  });
});
