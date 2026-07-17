import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { FinishStepComponent } from '../finish-step.component';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(FinishStepComponent.name, () => {
  let fixture: ComponentFixture<FinishStepComponent>;

  const query = (testId: string): HTMLElement | null =>
    (fixture.debugElement.nativeElement as HTMLElement).querySelector(
      `[data-testid="${testId}"]`,
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FinishStepComponent],
      providers: [
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FinishStepComponent);
  });

  it('previews what the app opens onto next', () => {
    fixture.detectChanges();

    const nativeElement = fixture.debugElement.nativeElement as HTMLElement;

    expect(
      nativeElement.querySelectorAll('.finish-step__highlights li'),
    ).toHaveLength(3);
  });

  it('greets the user with the generic title when no display name is set', () => {
    fixture.detectChanges();

    expect(query('onboarding-finish-title')).not.toBeNull();
    expect(query('onboarding-finish-title-named')).toBeNull();
  });

  it('personalises the greeting when a display name is available', () => {
    fixture.componentRef.setInput('displayName', 'Foodie');

    fixture.detectChanges();

    expect(query('onboarding-finish-title-named')).not.toBeNull();
    expect(query('onboarding-finish-title')).toBeNull();
  });
});
