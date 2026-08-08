import { ComponentRef } from '@angular/core';
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
  langChanges$: of('en'),
  // The transloco pipe resolves its scope before it renders a key.
  _loadDependencies: jest.fn(() => of({})),
};

const VALID_CREDENTIALS = {
  email: 'test@example.com',
  password: 'anypassword',
};

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let componentRef: ComponentRef<LoginComponent>;

  const byTestId = (testId: string): HTMLElement & { disabled: boolean } =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  /**
   * The transloco pipe only has a value after its scope resolution has been
   * flushed, so a second pass is needed before translated labels are readable.
   */
  const render = (): void => {
    fixture.detectChanges();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    render();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit submitLoginWithGoogle on button click', () => {
    const submitLoginWithGoogleEmitSpy = jest.spyOn(
      component.submitLoginWithGoogle,
      'emit',
    );
    component.onGoogleLogin();

    expect(submitLoginWithGoogleEmitSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit submitLoginWithApple on button click', () => {
    const submitLoginWithAppleEmitSpy = jest.spyOn(
      component.submitLoginWithApple,
      'emit',
    );
    component.onAppleLogin();

    expect(submitLoginWithAppleEmitSpy).toHaveBeenCalledTimes(1);
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

  it('should emit the credentials when a valid form is submitted', () => {
    const submitted = jest.fn();
    component.submitAuth.subscribe(submitted);
    component.authFormGroup.setValue(VALID_CREDENTIALS);

    component.onSubmit();

    expect(submitted).toHaveBeenCalledWith(VALID_CREDENTIALS);
  });

  it('should not emit while the form is invalid', () => {
    const submitted = jest.fn();
    component.submitAuth.subscribe(submitted);

    component.onSubmit();

    expect(submitted).not.toHaveBeenCalled();
  });

  // Issue #1273: sign-in takes seconds, and until now nothing on the screen
  // said so, which invites a second tap on a credential submission.
  describe('given a login is pending', () => {
    beforeEach(() => {
      component.authFormGroup.setValue(VALID_CREDENTIALS);
      componentRef.setInput('pending', true);
      render();
    });

    it('should disable the submit button and show progress', () => {
      expect(byTestId('submit').disabled).toBe(true);
      expect(byTestId('submit-spinner')).toBeTruthy();
      expect(byTestId('submit').textContent).toContain('log-in-in-progress');
    });

    it('should run the header progress bar', () => {
      expect(byTestId('page-loading-bar')).toBeTruthy();
    });

    it('should not emit a second submit', () => {
      const submitted = jest.fn();
      component.submitAuth.subscribe(submitted);

      component.onSubmit();

      expect(submitted).not.toHaveBeenCalled();
    });

    it('should lock the social sign-in actions too', () => {
      const google = jest.fn();
      const apple = jest.fn();
      component.submitLoginWithGoogle.subscribe(google);
      component.submitLoginWithApple.subscribe(apple);

      component.onGoogleLogin();
      component.onAppleLogin();

      expect(byTestId('google-login').disabled).toBe(true);
      expect(byTestId('apple-login').disabled).toBe(true);
      expect(google).not.toHaveBeenCalled();
      expect(apple).not.toHaveBeenCalled();
    });

    it('should release the form once the login succeeds', () => {
      componentRef.setInput('pending', false);
      render();

      expect(byTestId('submit').disabled).toBe(false);
      expect(byTestId('submit-spinner')).toBeFalsy();
      expect(byTestId('submit').textContent).toContain('log-in');
      expect(byTestId('google-login').disabled).toBe(false);
      expect(byTestId('apple-login').disabled).toBe(false);
      expect(byTestId('page-loading-bar')).toBeFalsy();
    });

    it('should release the form and surface the error when the login fails', () => {
      componentRef.setInput('pending', false);
      componentRef.setInput('loginFailed', true);
      render();

      expect(byTestId('submit').disabled).toBe(false);
      expect(byTestId('submit-spinner')).toBeFalsy();
      expect(fixture.nativeElement.textContent).toContain(
        'something-went-wrong-please-try-again',
      );
    });
  });
});
