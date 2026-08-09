import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
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

  describe('home city', () => {
    it('asks for the home city whatever the position permission is', () => {
      fixture.componentRef.setInput('permission', 'denied');

      fixture.detectChanges();

      // The home city is profile data, so refusing the device position must
      // not take the question away (issue #1271).
      expect(query('onboarding-home-city')).not.toBeNull();
    });

    it('prefills the city an existing profile already carries', () => {
      fixture.componentRef.setInput('homeCity', 'Bern');

      fixture.detectChanges();

      expect(component['homeCityControl'].value).toBe('Bern');
    });

    it('leaves a city the user is typing alone when the profile arrives late', () => {
      fixture.detectChanges();
      component['homeCityControl'].markAsDirty();
      component['homeCityControl'].setValue('Zurich', { emitEvent: false });

      fixture.componentRef.setInput('homeCity', 'Bern');
      fixture.detectChanges();

      expect(component['homeCityControl'].value).toBe('Zurich');
    });

    it('emits the trimmed city once typing settles', fakeAsync(() => {
      fixture.detectChanges();
      const homeCityChange = jest.spyOn(component.homeCityChange, 'emit');

      component['homeCityControl'].setValue('  Bern  ');
      tick(250);

      expect(homeCityChange).toHaveBeenCalledWith('Bern');
    }));

    it('emits an empty city when the user clears the field', fakeAsync(() => {
      fixture.componentRef.setInput('homeCity', 'Bern');
      fixture.detectChanges();
      const homeCityChange = jest.spyOn(component.homeCityChange, 'emit');

      // Clearing is a real answer, not a no-op: it has to reach the service so
      // the previously stored city is actually removed.
      component['homeCityControl'].setValue('');
      tick(250);

      expect(homeCityChange).toHaveBeenCalledWith('');
    }));

    it.each([
      [true, 'onboarding-home-city-visibility-public'],
      [false, 'onboarding-home-city-visibility-private'],
    ])('states who can see it when public is %s', (isPublicProfile, key) => {
      fixture.componentRef.setInput('isPublicProfile', isPublicProfile);

      fixture.detectChanges();

      // The field is shown publicly, so who can see it is stated rather than
      // left implicit in the visibility choice made a step earlier.
      expect(query('onboarding-home-city-visibility')).not.toBeNull();
      expect(component['visibilityNoteKey']()).toBe(key);
    });
  });
});
