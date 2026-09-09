import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import {
  AlertController,
  AlertOptions,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
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
  subscriptionTier: 0,
  ...over,
});

/**
 * The confirmation alerts, captured rather than rendered: Ionic's overlay
 * never enters the fixture's DOM, so the options object is what there is to
 * assert on, and pressing a button means calling the handler it carries.
 */
interface AlertButton {
  text?: string;
  role?: string;
  handler?: () => void;
}

describe(UserManagementComponent.name, () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let ref: ComponentRef<UserManagementComponent>;
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

  const textOf = (testId: string): string =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`)
      ?.textContent ?? '';

  beforeEach(() => {
    // `ta-page` renders an `ion-back-button` here, which injects the Router.
    // (The `Invalid base URL` lines in this suite's output are ionicons
    // resolving svg paths under jsdom, and are unrelated.)
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

    it('offers the staff role, because it renders from the role list', () => {
      expect(component.allRoles).toContain('staff');
      expect(
        fixture.nativeElement.querySelector('[data-testid="role-staff"]'),
      ).not.toBeNull();
    });

    // `setUserRoles` refuses the pair and stays the authority. This is so the
    // refusal reads as a reason next to the checkboxes rather than as a failed
    // save afterwards (issue #1075).
    describe('business and staff together', () => {
      const saveDisabled = (): boolean =>
        fixture.nativeElement.querySelector('[data-testid="admin-user-save"]')
          .disabled;

      it('is reported as a conflict', () => {
        component.toggleRole('staff', true);
        fixture.detectChanges();

        expect(component.rolesConflict()).toBe(true);
        expect(textOf('admin-user-roles-conflict')).toContain(
          'admin-users-roles-conflict-hint',
        );
      });

      it('disables the save even though the form is dirty', () => {
        component.toggleRole('staff', true);
        fixture.detectChanges();

        expect(component.dirty()).toBe(true);
        expect(saveDisabled()).toBe(true);
      });

      it('emits nothing if a queued click lands anyway', () => {
        const emitted: unknown[] = [];
        component.save.subscribe((event) => emitted.push(event));

        component.toggleRole('staff', true);
        component.onSave();

        expect(emitted).toEqual([]);
      });

      it('clears once one of the two is unticked', () => {
        component.toggleRole('staff', true);
        component.toggleRole('business', false);
        fixture.detectChanges();

        expect(component.rolesConflict()).toBe(false);
        expect(saveDisabled()).toBe(false);
        expect(
          fixture.nativeElement.querySelector(
            '[data-testid="admin-user-roles-conflict"]',
          ),
        ).toBeNull();
      });

      // `admin` is in conflict with neither: an operator account may also run
      // a restaurant.
      it('does not flag admin alongside either role', () => {
        component.toggleRole('admin', true);
        fixture.detectChanges();

        expect(component.rolesConflict()).toBe(false);
      });

      it('says nothing about a conflict on an untouched form', () => {
        expect(component.rolesConflict()).toBe(false);
        expect(
          fixture.nativeElement.querySelector(
            '[data-testid="admin-user-roles-conflict"]',
          ),
        ).toBeNull();
      });
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

  describe('the subscription tier form', () => {
    beforeEach(() => {
      setInputs({ users: [user()], selected: user({ subscriptionTier: 0 }) });
    });

    it('starts from the tier the account holds', () => {
      expect(component.draftTier()).toBe(0);
      expect(component.tierDirty()).toBe(false);
    });

    // The callable requires a reason, and a disabled button says so earlier
    // than a rejected call does.
    it('cannot be saved without a reason', () => {
      component.onTierChange(1);

      expect(component.tierDirty()).toBe(true);
      expect(component.canSaveTier()).toBe(false);
    });

    it('cannot be saved on whitespace passing for a reason', () => {
      component.onTierChange(1);
      component.onTierReasonChange('   ');

      expect(component.canSaveTier()).toBe(false);
    });

    it('cannot be saved without a change', () => {
      component.onTierReasonChange('refund honoured');

      expect(component.canSaveTier()).toBe(false);
    });

    it('emits the account, the tier and the trimmed reason on save', () => {
      const emitted: unknown[] = [];
      component.saveTier.subscribe((event) => emitted.push(event));

      component.onTierChange(1);
      component.onTierReasonChange('  refund honoured  ');
      component.onSaveTier();

      expect(emitted).toEqual([
        { uid: 'u1', tier: 1, reason: 'refund honoured' },
      ]);
    });

    it('clears the reason after saving, so it cannot be reused unnoticed', () => {
      component.onTierChange(1);
      component.onTierReasonChange('refund honoured');
      component.onSaveTier();

      expect(component.tierReason()).toBe('');
    });

    it('emits nothing when the save is not allowed', () => {
      const emitted: unknown[] = [];
      component.saveTier.subscribe((event) => emitted.push(event));

      component.onTierChange(1);
      component.onSaveTier();

      expect(emitted).toEqual([]);
    });

    // The same carry-over bug the role draft guards against, with a worse
    // outcome: a reason written about one account attached to another.
    it('drops a pending tier edit and its reason when another account is selected', () => {
      component.onTierChange(1);
      component.onTierReasonChange('refund honoured');

      const other = user({ uid: 'u2', email: 'mia@example.com' });
      component.onSelect(other);
      setInputs({ selected: other });

      expect(component.draftTier()).toBe(0);
      expect(component.tierReason()).toBe('');
      expect(component.tierDirty()).toBe(false);
    });
  });

  describe('an account with no tier', () => {
    beforeEach(() => {
      setInputs({
        users: [user({ subscriptionTier: null })],
        selected: user({ subscriptionTier: null }),
      });
    });

    // `null` is "nobody ever decided", and Free is a decision. Showing the
    // absence as Free would present a made-up answer as a real one.
    it('reads as no tier rather than as Free', () => {
      expect(component.currentTier()).toBeNull();
      expect(component.tierLabelKey(null)).toBe('admin-users-tier-none');
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="admin-user-tier-current"]',
        ).textContent,
      ).toContain('admin-users-tier-none');
    });

    it('offers no preselected tier, so the operator has to choose one', () => {
      expect(component.draftTier()).toBeNull();
      expect(component.canSaveTier()).toBe(false);
    });

    it('becomes saveable once a tier and a reason are given', () => {
      component.onTierChange(0);
      component.onTierReasonChange('confirmed free');

      expect(component.tierDirty()).toBe(true);
      expect(component.canSaveTier()).toBe(true);
    });
  });

  it('labels the tiers it renders', () => {
    expect(component.tierLabelKey(0)).toBe('admin-users-tier-free');
    expect(component.tierLabelKey(1)).toBe('admin-users-tier-pro');
  });

  // Blocking is the one action on this form that takes something away, and it
  // sits under the role checkboxes a misclick away (issue #1474).
  describe('blocking an account', () => {
    const active = user({ uid: 'u1', disabled: false });
    const blockedAccount = user({ uid: 'u1', disabled: true });

    const emitted: { uid: string; blocked: boolean }[] = [];

    beforeEach(() => {
      emitted.length = 0;
      component.saveBlocked.subscribe((event) => emitted.push(event));
      setInputs({ users: [active], selected: active });
    });

    it('reads the state off the account rather than holding its own copy', () => {
      expect(component.blocked()).toBe(false);

      setInputs({ selected: blockedAccount });

      expect(component.blocked()).toBe(true);
    });

    it('shows the account as active until it is blocked', () => {
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="admin-user-block-state"]',
        ).textContent,
      ).toContain('admin-users-active');
    });

    it('names a blocked account as blocked', () => {
      setInputs({ selected: blockedAccount });

      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="admin-user-block-state"]',
        ).textContent,
      ).toContain('admin-users-blocked');
    });

    // A single misclick must not block anyone.
    it('emits nothing until the confirmation is accepted', async () => {
      await component.onToggleBlocked();

      expect(alerts).toHaveLength(1);
      expect(emitted).toEqual([]);
    });

    it('emits the block once the confirmation is accepted', async () => {
      await component.onToggleBlocked();
      pressAlertButton('destructive');

      expect(emitted).toEqual([{ uid: 'u1', blocked: true }]);
    });

    it('emits nothing when the confirmation is cancelled', async () => {
      await component.onToggleBlocked();
      pressAlertButton('cancel');

      expect(emitted).toEqual([]);
    });

    // The alert repeats the account rather than trusting that the form behind
    // it is still the one being read.
    it('names the account in the confirmation', async () => {
      await component.onToggleBlocked();

      expect(lastAlert().subHeader).toBe('ada@example.com');
      expect(lastAlert().header).toBe('admin-users-block-confirm-title');
    });

    // Re-admitting an account somebody deliberately stopped is also a decision,
    // and nothing but the log would show a misclicked one.
    it('confirms an unblock too, and sends the flag rather than a toggle', async () => {
      setInputs({ selected: blockedAccount });

      await component.onToggleBlocked();

      expect(lastAlert().header).toBe('admin-users-unblock-confirm-title');
      pressAlertButton('confirm');

      expect(emitted).toEqual([{ uid: 'u1', blocked: false }]);
    });

    it('emits nothing with no account selected', async () => {
      setInputs({ selected: undefined });

      await component.onToggleBlocked();

      expect(alerts).toEqual([]);
      expect(emitted).toEqual([]);
    });

    describe('the operator’s own account', () => {
      beforeEach(() => setInputs({ operatorUid: 'u1' }));

      // Only an admin can unblock, so blocking yourself takes the tool that
      // would let you back in with you. The callable refuses it as well.
      it('refuses to block it, and says why', () => {
        expect(component.isOwnAccount()).toBe(true);
        expect(component.blockRefused()).toBe(true);
        expect(
          fixture.nativeElement.querySelector(
            '[data-testid="admin-user-block-refused"]',
          ),
        ).not.toBeNull();
      });

      it('opens no confirmation for it', async () => {
        await component.onToggleBlocked();

        expect(alerts).toEqual([]);
        expect(emitted).toEqual([]);
      });

      it('refuses nothing on another operator’s account', () => {
        setInputs({ operatorUid: 'someone-else' });

        expect(component.blockRefused()).toBe(false);
      });
    });
  });

  // An operator scanning the list has to be able to tell a blocked account from
  // an active one without opening it.
  it('marks a blocked account in the list', () => {
    setInputs({
      users: [
        user({ uid: 'u1', email: 'ada@example.com', disabled: true }),
        user({ uid: 'u2', email: 'mia@example.com' }),
      ],
    });

    expect(
      fixture.nativeElement.querySelectorAll(
        '[data-testid="admin-user-blocked-badge"]',
      ),
    ).toHaveLength(1);
  });

  // Finding the account and acting on it are one errand, so the filter lives on
  // the page that holds the form rather than on a search surface of its own
  // (issue #1476).
  describe('finding an account', () => {
    const ada = user({
      uid: 'uid-ada',
      email: 'ada@example.com',
      displayName: 'ada-lovelace',
    });
    const mia = user({
      uid: 'uid-mia',
      email: 'mia@example.com',
      displayName: 'mia',
    });

    beforeEach(() => setInputs({ users: [ada, mia] }));

    it('shows every account until something is typed', () => {
      expect(component.visibleUsers()).toEqual([ada, mia]);
    });

    it('finds an account by its email', () => {
      component.onFilterChange('mia@example');

      expect(component.visibleUsers()).toEqual([mia]);
    });

    // The display name is the field the report usually names, and it lives only
    // on the `/users` document — the account list joins it in for this.
    it('finds an account by its display name', () => {
      component.onFilterChange('lovelace');

      expect(component.visibleUsers()).toEqual([ada]);
    });

    // An id is not required, but a reported one should still resolve.
    it('finds an account by its uid', () => {
      component.onFilterChange('uid-mia');

      expect(component.visibleUsers()).toEqual([mia]);
    });

    it.each([['ADA@EXAMPLE.COM'], ['  ada  ']])(
      'matches %p regardless of case and surrounding space',
      (term) => {
        component.onFilterChange(term);

        expect(component.visibleUsers()).toEqual([ada]);
      },
    );

    it('renders only the matches', () => {
      component.onFilterChange('lovelace');
      fixture.detectChanges();

      const text = fixture.nativeElement.querySelector(
        '[data-testid="admin-user-list"]',
      ).textContent;
      expect(text).toContain('ada@example.com');
      expect(text).not.toContain('mia@example.com');
    });

    it('opens the form for a match without clearing the term', () => {
      const emitted: AdminUser[] = [];
      component.selectUser.subscribe((u) => emitted.push(u));
      component.onFilterChange('lovelace');

      component.onSelect(ada);

      expect(emitted).toEqual([ada]);
      expect(component.filter()).toBe('lovelace');
    });

    // An empty list means opposite things in the two cases, and they read
    // identically without this.
    it('says no account matched rather than that there are none', () => {
      component.onFilterChange('nobody');
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="admin-user-list-empty"]',
        ).textContent,
      ).toContain('admin-users-no-matches');
    });

    it('says there are none when the list itself is empty', () => {
      setInputs({ users: [] });
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="admin-user-list-empty"]',
        ).textContent,
      ).toContain('admin-users-empty');
    });
  });
});
