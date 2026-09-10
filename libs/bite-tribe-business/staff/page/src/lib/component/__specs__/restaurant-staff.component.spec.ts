import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  AlertController,
  AlertOptions,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RestaurantStaffMember } from 'bite-tribe-business/staff-data-access';
import { RestaurantStaffComponent } from '../restaurant-staff.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

const member = (
  over: Partial<RestaurantStaffMember> = {},
): RestaurantStaffMember => ({
  uid: 'waiter-1',
  email: 'waiter@example.com',
  displayName: 'Sam',
  addedBy: 'owner-1',
  addedAt: '2026-09-10T09:00:00.000Z',
  ...over,
});

/**
 * The confirmation alert, captured rather than rendered: Ionic's overlay never
 * enters the fixture's DOM, so the options object is what there is to assert
 * on, and pressing a button means calling the handler it carries.
 */
interface AlertButton {
  text?: string;
  role?: string;
  handler?: () => void;
}

describe(RestaurantStaffComponent.name, () => {
  let component: RestaurantStaffComponent;
  let fixture: ComponentFixture<RestaurantStaffComponent>;
  let ref: ComponentRef<RestaurantStaffComponent>;
  let alerts: AlertOptions[];

  const lastAlert = (): AlertOptions => alerts[alerts.length - 1];

  const pressAlertButton = (role: string): void => {
    const buttons = (lastAlert().buttons ?? []) as AlertButton[];

    buttons.find((button) => button.role === role)?.handler?.();
  };

  const setInputs = (inputs: Record<string, unknown>): void => {
    Object.entries(inputs).forEach(([key, value]) => ref.setInput(key, value));
    fixture.detectChanges();
  };

  const query = (testId: string): Element | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    alerts = [];
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        {
          provide: AlertController,
          useValue: {
            create: jest.fn((options: AlertOptions) => {
              alerts.push(options);

              return Promise.resolve({ present: jest.fn() });
            }),
          },
        },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string): string => key },
        },
      ],
    })
      .overrideComponent(RestaurantStaffComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(RestaurantStaffComponent);
    component = fixture.componentInstance;
    ref = fixture.componentRef;
    fixture.detectChanges();
  });

  it('lists the people it is given', () => {
    setInputs({ staff: [member(), member({ uid: 'w2', email: 'b@x.io' })] });

    expect(fixture.nativeElement.textContent).toContain('waiter@example.com');
    expect(fixture.nativeElement.textContent).toContain('b@x.io');
  });

  /**
   * Empty is the ordinary state: a restaurant starts with nobody on it, and
   * the owner is the one who changes that. It is not an error and it is not a
   * failed read, so it says so in a sentence rather than showing nothing.
   */
  it('says so when nobody works here yet', () => {
    setInputs({ staff: [] });

    expect(query('restaurant-staff-empty')).not.toBeNull();
  });

  it('shows a spinner instead of an empty list while loading', () => {
    setInputs({ staff: [], loading: true });

    expect(query('restaurant-staff-empty')).toBeNull();
  });

  it('names the restaurant the staff belong to', () => {
    setInputs({ staff: [], restaurantName: 'Pizza Palace' });

    expect(fixture.nativeElement.textContent).toContain('Pizza Palace');
  });

  it('falls back to the uid rather than showing a blank row', () => {
    expect(component.label(member({ email: '', displayName: '' }))).toBe(
      'waiter-1',
    );
  });

  describe('adding someone', () => {
    it('refuses to submit until the address looks like one', () => {
      component.onEmailChange('waiter');

      expect(component.canAdd()).toBe(false);

      component.onEmailChange('waiter@example.com');

      expect(component.canAdd()).toBe(true);
    });

    it('emits the trimmed address and clears the field', () => {
      const added: string[] = [];
      component.addStaff.subscribe((email) => added.push(email));

      component.onEmailChange('  waiter@example.com  ');
      component.onAdd();

      expect(added).toEqual(['waiter@example.com']);
      expect(component.email()).toBe('');
    });

    it('emits nothing while a previous change is still saving', () => {
      const added: string[] = [];
      component.addStaff.subscribe((email) => added.push(email));

      setInputs({ saving: true });
      component.onEmailChange('waiter@example.com');
      component.onAdd();

      expect(added).toEqual([]);
    });
  });

  /**
   * Removal takes something away and does not take effect instantly, which is
   * why it confirms and why the confirmation says how long the removed account
   * keeps a session it already has open.
   */
  describe('removing someone', () => {
    it('asks before removing, and names who', async () => {
      setInputs({ staff: [member()] });

      await component.onRemove(member());

      expect(lastAlert().subHeader).toBe('waiter@example.com');
    });

    it('emits nothing when the confirmation is cancelled', async () => {
      const removed: RestaurantStaffMember[] = [];
      component.removeStaff.subscribe((value) => removed.push(value));

      await component.onRemove(member());
      pressAlertButton('cancel');

      expect(removed).toEqual([]);
    });

    it('emits the member once the removal is confirmed', async () => {
      const removed: RestaurantStaffMember[] = [];
      component.removeStaff.subscribe((value) => removed.push(value));

      await component.onRemove(member());
      pressAlertButton('destructive');

      expect(removed).toEqual([member()]);
    });
  });
});
