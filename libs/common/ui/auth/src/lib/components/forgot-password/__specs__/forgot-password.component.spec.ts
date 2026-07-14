import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { ForgotPasswordComponent } from '../forgot-password.component';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(ForgotPasswordComponent.name, () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });
    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should prefill the email from initialEmail', () => {
    fixture.componentRef.setInput('initialEmail', 'test@example.com');
    fixture.detectChanges();

    expect(component.forgotPasswordFormGroup.controls['email'].value).toBe(
      'test@example.com',
    );
  });

  it('should have invalid form when email is empty', () => {
    component.forgotPasswordFormGroup.controls['email'].setValue('');

    expect(component.forgotPasswordFormGroup.invalid).toBe(true);
  });

  it('should have invalid form when email format is invalid', () => {
    component.forgotPasswordFormGroup.controls['email'].setValue(
      'not-an-email',
    );

    expect(component.forgotPasswordFormGroup.invalid).toBe(true);
  });

  it('should emit submitPasswordReset with the email when form is valid', () => {
    const submitPasswordResetEmitSpy = jest.spyOn(
      component.submitPasswordReset,
      'emit',
    );
    component.forgotPasswordFormGroup.controls['email'].setValue(
      'test@example.com',
    );

    component.submit();

    expect(submitPasswordResetEmitSpy).toHaveBeenCalledWith('test@example.com');
  });

  it('should not emit submitPasswordReset when form is invalid', () => {
    const submitPasswordResetEmitSpy = jest.spyOn(
      component.submitPasswordReset,
      'emit',
    );
    component.forgotPasswordFormGroup.controls['email'].setValue(
      'not-an-email',
    );

    component.submit();

    expect(submitPasswordResetEmitSpy).not.toHaveBeenCalled();
  });
});
