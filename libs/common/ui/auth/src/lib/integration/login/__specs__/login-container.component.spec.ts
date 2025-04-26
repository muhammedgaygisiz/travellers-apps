import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LoginContainerComponent } from '../login-container.component';
import { LoginService } from '../login.service';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';

describe('LoginContainerComponent', () => {
  let component: LoginContainerComponent;
  let fixture: ComponentFixture<LoginContainerComponent>;
  let mockLoginService: jest.Mocked<LoginService>;

  beforeEach(async () => {
    mockLoginService = {
      loginFailed: signal(false),
      login: jest.fn(),
      gotoSignUp: jest.fn(),
      loginWithGoogleAccount: jest.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        {
          provide: LoginService,
          useValue: mockLoginService,
        },
      ],
    }).compileComponents();

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

  it('should call gotoSignUp on service when gotoSignup is called', async () => {
    await component.gotoSignup();
    expect(mockLoginService.gotoSignUp).toHaveBeenCalled();
  });

  it('should call loginWithGoogleAccount on service when onSignupWithGoogle is called', () => {
    component.onSignupWithGoogle();
    expect(mockLoginService.loginWithGoogleAccount).toHaveBeenCalled();
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

    expect(componentWithoutService.loginFailed()).toBeTruthy();
  });
});
