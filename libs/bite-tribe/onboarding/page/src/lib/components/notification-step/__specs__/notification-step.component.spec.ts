import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { NotificationStepComponent } from '../notification-step.component';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(NotificationStepComponent.name, () => {
  let fixture: ComponentFixture<NotificationStepComponent>;
  let component: NotificationStepComponent;

  const query = (testId: string): HTMLElement | null =>
    (fixture.debugElement.nativeElement as HTMLElement).querySelector(
      `[data-testid="${testId}"]`,
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NotificationStepComponent],
      providers: [
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationStepComponent);
    component = fixture.componentInstance;
  });

  it('explains the value before any prompt is triggered', () => {
    fixture.detectChanges();

    const nativeElement = fixture.debugElement.nativeElement as HTMLElement;

    expect(
      nativeElement.querySelectorAll('.notification-step__benefits li'),
    ).toHaveLength(3);
    expect(query('onboarding-notifications-enable')).not.toBeNull();
    expect(query('onboarding-notifications-outcome')).toBeNull();
  });

  it('asks for permission only when the user opts in', () => {
    fixture.detectChanges();
    const enableNotifications = jest.spyOn(
      component.enableNotifications,
      'emit',
    );

    query('onboarding-notifications-enable')?.click();

    expect(enableNotifications).toHaveBeenCalled();
  });

  it('emits an explicit decline when the user skips', () => {
    fixture.detectChanges();
    const skipNotifications = jest.spyOn(component.skipNotifications, 'emit');

    query('onboarding-notifications-skip')?.click();

    expect(skipNotifications).toHaveBeenCalled();
  });

  it('blocks a second request while one is in flight', () => {
    fixture.componentRef.setInput('permission', 'requesting');

    fixture.detectChanges();

    expect(
      (query('onboarding-notifications-enable') as HTMLIonButtonElement)
        .disabled,
    ).toBe(true);
  });

  it.each(['granted', 'denied', 'unsupported'])(
    'reports the outcome and stops asking once permission is %s',
    (permission) => {
      fixture.componentRef.setInput('permission', permission);

      fixture.detectChanges();

      expect(query('onboarding-notifications-outcome')).not.toBeNull();
      // A decided permission cannot be re-prompted by the OS, so the actions
      // are gone rather than offering a button that would do nothing.
      expect(query('onboarding-notifications-enable')).toBeNull();
      expect(query('onboarding-notifications-skip')).toBeNull();
    },
  );
});
