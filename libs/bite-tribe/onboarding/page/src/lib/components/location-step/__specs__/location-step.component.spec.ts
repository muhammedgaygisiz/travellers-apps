import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { LocationStepComponent } from '../location-step.component';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(LocationStepComponent.name, () => {
  let fixture: ComponentFixture<LocationStepComponent>;
  let component: LocationStepComponent;

  const query = (testId: string): HTMLElement | null =>
    (fixture.debugElement.nativeElement as HTMLElement).querySelector(
      `[data-testid="${testId}"]`,
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LocationStepComponent],
      providers: [
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationStepComponent);
    component = fixture.componentInstance;
  });

  it('explains the value before any prompt is triggered', () => {
    fixture.detectChanges();

    const nativeElement = fixture.debugElement.nativeElement as HTMLElement;

    expect(
      nativeElement.querySelectorAll('.location-step__benefits li'),
    ).toHaveLength(4);
    expect(query('onboarding-location-enable')).not.toBeNull();
    expect(query('onboarding-location-outcome')).toBeNull();
  });

  it('asks for permission only when the user opts in', () => {
    fixture.detectChanges();
    const enableLocation = jest.spyOn(component.enableLocation, 'emit');

    query('onboarding-location-enable')?.click();

    expect(enableLocation).toHaveBeenCalled();
  });

  it('emits an explicit decline when the user skips', () => {
    fixture.detectChanges();
    const skipLocation = jest.spyOn(component.skipLocation, 'emit');

    query('onboarding-location-skip')?.click();

    expect(skipLocation).toHaveBeenCalled();
  });

  it('blocks a second request while one is in flight', () => {
    fixture.componentRef.setInput('permission', 'requesting');

    fixture.detectChanges();

    expect(
      (query('onboarding-location-enable') as HTMLIonButtonElement).disabled,
    ).toBe(true);
  });

  it.each(['granted', 'denied', 'unsupported'])(
    'reports the outcome and stops asking once permission is %s',
    (permission) => {
      fixture.componentRef.setInput('permission', permission);

      fixture.detectChanges();

      expect(query('onboarding-location-outcome')).not.toBeNull();
      // A decided permission cannot be re-prompted by the OS, so the actions
      // are gone rather than offering a button that would do nothing.
      expect(query('onboarding-location-enable')).toBeNull();
      expect(query('onboarding-location-skip')).toBeNull();
    },
  );
});
