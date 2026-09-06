import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AdminUser } from 'bite-tribe-admin/user-management-data-access';
import { UserManagementComponent } from '../user-management.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

const user = (over: Partial<AdminUser> = {}): AdminUser => ({
  uid: 'u1',
  email: 'ada@example.com',
  displayName: 'Ada',
  roles: [],
  disabled: false,
  emailVerified: true,
  providerIds: ['password'],
  createdAt: '',
  lastSignInAt: '',
  ...over,
});

describe(UserManagementComponent.name, () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let ref: ComponentRef<UserManagementComponent>;

  const setInputs = (inputs: Record<string, unknown>): void => {
    Object.entries(inputs).forEach(([key, value]) => ref.setInput(key, value));
    fixture.detectChanges();
  };

  beforeEach(() => {
    // `ta-page` renders an `ion-back-button` here, which injects the Router.
    // (The `Invalid base URL` lines in this suite's output are ionicons
    // resolving svg paths under jsdom, and are unrelated.)
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(), provideRouter([])],
    })
      .overrideComponent(UserManagementComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    ref = fixture.componentRef;
    fixture.detectChanges();
  });

  it('lists the accounts it is given', () => {
    setInputs({
      users: [user(), user({ uid: 'u2', email: 'mia@example.com' })],
    });

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('ada@example.com');
    expect(text).toContain('mia@example.com');
  });

  it('shows no form until an account is selected', () => {
    setInputs({ users: [user()] });

    expect(
      fixture.nativeElement.querySelector('[data-testid="admin-user-form"]'),
    ).toBeNull();
  });

  it('emits the account that was clicked', () => {
    const emitted: AdminUser[] = [];
    component.selectUser.subscribe((u) => emitted.push(u));
    const target = user();

    component.onSelect(target);

    expect(emitted).toEqual([target]);
  });

  describe('the role form', () => {
    beforeEach(() => {
      setInputs({ users: [user()], selected: user({ roles: ['business'] }) });
    });

    it('starts from the roles the account holds', () => {
      expect(component.draftRoles()).toEqual(['business']);
      expect(component.holds('business')).toBe(true);
      expect(component.holds('admin')).toBe(false);
    });

    it('is not dirty before anything is changed', () => {
      expect(component.dirty()).toBe(false);
    });

    it('adds a role without dropping the ones already held', () => {
      component.toggleRole('admin', true);

      expect(component.draftRoles().sort()).toEqual(['admin', 'business']);
      expect(component.dirty()).toBe(true);
    });

    it('removes a role', () => {
      component.toggleRole('business', false);

      expect(component.draftRoles()).toEqual([]);
      expect(component.dirty()).toBe(true);
    });

    it('does not duplicate a role toggled on twice', () => {
      component.toggleRole('admin', true);
      component.toggleRole('admin', true);

      expect(component.draftRoles().filter((r) => r === 'admin')).toHaveLength(
        1,
      );
    });

    // Toggling back to the original set is not a change to save.
    it('is clean again when the edit is undone', () => {
      component.toggleRole('admin', true);
      component.toggleRole('admin', false);

      expect(component.dirty()).toBe(false);
    });

    it('emits the account and the edited roles on save', () => {
      const emitted: { uid: string; roles: string[] }[] = [];
      component.save.subscribe((event) => emitted.push(event));

      component.toggleRole('admin', true);
      component.onSave();

      expect(emitted).toEqual([
        { uid: 'u1', roles: expect.arrayContaining(['business', 'admin']) },
      ]);
    });
  });

  // The Save button is disabled without a selection, but a queued click can
  // still land between the selection clearing and the button locking.
  it('emits nothing when saving with no account selected', () => {
    const emitted: unknown[] = [];
    component.save.subscribe((event) => emitted.push(event));

    component.onSave();

    expect(emitted).toEqual([]);
  });

  // The bug this guards: edit one account, click another, and the first
  // account's pending roles would be shown as the second's.
  it('drops a pending edit when another account is selected', () => {
    setInputs({ selected: user({ roles: ['business'] }) });
    component.toggleRole('admin', true);
    expect(component.dirty()).toBe(true);

    component.onSelect(user({ uid: 'u2', email: 'mia@example.com' }));
    setInputs({ selected: user({ uid: 'u2', email: 'mia@example.com' }) });

    expect(component.draftRoles()).toEqual([]);
    expect(component.dirty()).toBe(false);
  });

  it('reflects roles saved elsewhere once the list reloads', () => {
    setInputs({ selected: user({ roles: [] }) });
    expect(component.draftRoles()).toEqual([]);

    setInputs({ selected: user({ roles: ['admin'] }) });

    expect(component.draftRoles()).toEqual(['admin']);
  });
});
