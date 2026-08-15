import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { VisibilityStepComponent } from '../visibility-step.component';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(VisibilityStepComponent.name, () => {
  let fixture: ComponentFixture<VisibilityStepComponent>;
  let component: VisibilityStepComponent;

  const optionInput = (testId: string): HTMLInputElement =>
    (fixture.debugElement.nativeElement as HTMLElement).querySelector(
      `[data-testid="${testId}"] input`,
    ) as HTMLInputElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [VisibilityStepComponent],
      providers: [
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VisibilityStepComponent);
    component = fixture.componentInstance;
  });

  it('preselects private when no explicit value exists', () => {
    fixture.componentRef.setInput('selectedPublic', null);

    fixture.detectChanges();

    expect(optionInput('onboarding-visibility-private').checked).toBe(true);
    expect(optionInput('onboarding-visibility-public').checked).toBe(false);
  });

  it('marks the public option checked when public is selected', () => {
    fixture.componentRef.setInput('selectedPublic', true);

    fixture.detectChanges();

    expect(optionInput('onboarding-visibility-private').checked).toBe(false);
    expect(optionInput('onboarding-visibility-public').checked).toBe(true);
  });

  it('renders each option label inside its own tappable card', () => {
    fixture.detectChanges();

    const nativeElement = fixture.debugElement.nativeElement as HTMLElement;

    expect(nativeElement.querySelectorAll('ion-radio')).toHaveLength(0);
    expect(
      nativeElement.querySelectorAll('label.visibility-option'),
    ).toHaveLength(2);
    expect(
      nativeElement.querySelectorAll('label .visibility-option__label'),
    ).toHaveLength(2);
  });

  it('emits public when the public option is chosen', () => {
    fixture.detectChanges();
    const visibilityChange = jest.spyOn(component.visibilityChange, 'emit');

    optionInput('onboarding-visibility-public').click();

    expect(visibilityChange).toHaveBeenCalledWith(true);
  });

  it('emits once when an option is chosen', () => {
    // A radio click fires both `click` and `change`; only `change` is bound, so
    // one tap must not report the same choice twice.
    fixture.detectChanges();
    const visibilityChange = jest.spyOn(component.visibilityChange, 'emit');

    optionInput('onboarding-visibility-public').click();

    expect(visibilityChange).toHaveBeenCalledTimes(1);
  });

  it('switches back to private after public was chosen', () => {
    fixture.componentRef.setInput('selectedPublic', true);
    fixture.detectChanges();
    const visibilityChange = jest.spyOn(component.visibilityChange, 'emit');

    optionInput('onboarding-visibility-private').click();

    expect(visibilityChange).toHaveBeenCalledWith(false);
    expect(optionInput('onboarding-visibility-private').checked).toBe(true);
  });
});
