import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { APP_TITLE, getIonicConfig } from 'utils';
import { RegistrationComponent } from '../registration.component';

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
  email: 'q@q.de',
  password: 'Test4711',
  passwordConfirm: 'Test4711',
};

describe(RegistrationComponent.name, () => {
  let component: RegistrationComponent;
  let fixture: ComponentFixture<RegistrationComponent>;
  let componentRef: ComponentRef<RegistrationComponent>;

  const submitButton = (): HTMLElement & { disabled: boolean } =>
    fixture.nativeElement.querySelector('[data-testid="submit"]');

  /**
   * The transloco pipe only has a value after its scope resolution has been
   * flushed, so a second pass is needed before translated labels are readable.
   */
  const render = (): void => {
    fixture.detectChanges();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrationComponent],
      providers: [
        provideIonicAngular(getIonicConfig()),
        provideRouter([]),
        { provide: APP_TITLE, useValue: 'Bite Tribe' },
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrationComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    render();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit the credentials when a valid form is submitted', () => {
    const submitted = jest.fn();
    component.submitRegistration.subscribe(submitted);
    component.registrationFormGroup.setValue(VALID_CREDENTIALS);

    component.onSubmit();

    expect(submitted).toHaveBeenCalledWith(VALID_CREDENTIALS);
  });

  it('should not emit while the form is invalid', () => {
    const submitted = jest.fn();
    component.submitRegistration.subscribe(submitted);

    component.onSubmit();

    expect(submitted).not.toHaveBeenCalled();
  });

  // Issue #1185: the transition into onboarding can take seconds, and a second
  // tap in that window would start a duplicate registration.
  describe('given registration is pending', () => {
    beforeEach(() => {
      component.registrationFormGroup.setValue(VALID_CREDENTIALS);
      componentRef.setInput('pending', true);
      render();
    });

    it('should disable the submit button and show progress', () => {
      expect(submitButton().disabled).toBe(true);
      expect(
        fixture.nativeElement.querySelector('[data-testid="submit-spinner"]'),
      ).toBeTruthy();
      expect(submitButton().textContent).toContain('registration-in-progress');
    });

    it('should run the header progress bar', () => {
      expect(
        fixture.nativeElement.querySelector('[data-testid="page-loading-bar"]'),
      ).toBeTruthy();
    });

    it('should not emit a second submit', () => {
      const submitted = jest.fn();
      component.submitRegistration.subscribe(submitted);

      component.onSubmit();

      expect(submitted).not.toHaveBeenCalled();
    });

    it('should restore the submit button once registration settles', () => {
      componentRef.setInput('pending', false);
      render();

      expect(submitButton().disabled).toBe(false);
      expect(
        fixture.nativeElement.querySelector('[data-testid="submit-spinner"]'),
      ).toBeFalsy();
      expect(submitButton().textContent).toContain('sign-up');
      expect(
        fixture.nativeElement.querySelector('[data-testid="page-loading-bar"]'),
      ).toBeFalsy();
    });
  });
});
