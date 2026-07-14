import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from '../login.component';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { provideIonicAngular } from '@ionic/angular/standalone';
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

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit submitSignupWithGoogle on button click', () => {
    const submitSignupWithGoogleEmitSpy = jest.spyOn(
      component.submitSignupWithGoogle,
      'emit',
    );
    component.onGoogleSignUp();

    expect(submitSignupWithGoogleEmitSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit submitSignupWithApple on button click', () => {
    const submitSignupWithAppleEmitSpy = jest.spyOn(
      component.submitSignupWithApple,
      'emit',
    );
    component.onAppleSignUp();

    expect(submitSignupWithAppleEmitSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit forgotPassword with the typed email', () => {
    const forgotPasswordEmitSpy = jest.spyOn(component.forgotPassword, 'emit');
    component.authFormGroup.controls.email.setValue('test@example.com');

    component.onForgotPassword();

    expect(forgotPasswordEmitSpy).toHaveBeenCalledWith('test@example.com');
  });

  it('should have invalid form when password is empty', () => {
    component.authFormGroup.setValue({
      email: 'test@example.com',
      password: '',
    });
    expect(component.authFormGroup.invalid).toBe(true);
  });

  it('should have valid form when email and password are provided', () => {
    component.authFormGroup.setValue({
      email: 'test@example.com',
      password: 'anypassword',
    });
    expect(component.authFormGroup.valid).toBe(true);
  });

  it('should accept any non-empty password without complex validation', () => {
    component.authFormGroup.setValue({
      email: 'test@example.com',
      password: 'abc',
    });
    expect(component.authFormGroup.valid).toBe(true);
  });
});
