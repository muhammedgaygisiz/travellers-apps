import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  AlertController,
  AlertOptions,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Restaurant } from 'model';
import { AdminUser } from 'bite-tribe-admin/user-management-data-access';
import { RestaurantOwnership } from '../restaurant-ownership';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

const restaurant = (over: Partial<Restaurant> = {}): Restaurant => ({
  id: 'r1',
  name: 'Pizza Palace',
  position: { latitude: 46.948, longitude: 7.4474 },
  ...over,
});

const account = (over: Partial<AdminUser> = {}): AdminUser => ({
  uid: 'owner-1',
  email: 'owner@example.com',
  displayName: 'Owner',
  roles: ['business'],
  disabled: false,
  emailVerified: true,
  providerIds: ['password'],
  createdAt: '',
  lastSignInAt: '',
  subscriptionTier: 0,
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

describe(RestaurantOwnership.name, () => {
  let component: RestaurantOwnership;
  let fixture: ComponentFixture<RestaurantOwnership>;
  let ref: ComponentRef<RestaurantOwnership>;
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
      .overrideComponent(RestaurantOwnership, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(RestaurantOwnership);
    component = fixture.componentInstance;
    ref = fixture.componentRef;
    fixture.detectChanges();
  });

  it('lists the restaurants it is given', () => {
    setInputs({
      restaurants: [
        restaurant(),
        restaurant({ id: 'r2', name: 'Cafe Central' }),
      ],
    });

    expect(fixture.nativeElement.textContent).toContain('Pizza Palace');
    expect(fixture.nativeElement.textContent).toContain('Cafe Central');
  });

  it('filters the restaurants on name and id', () => {
    setInputs({
      restaurants: [
        restaurant(),
        restaurant({ id: 'r2', name: 'Cafe Central' }),
      ],
    });

    component.onFilterChange('cafe');

    expect(component.visibleRestaurants().map((r) => r.id)).toEqual(['r2']);

    component.onFilterChange('r1');

    expect(component.visibleRestaurants().map((r) => r.id)).toEqual(['r1']);
  });

  it('shows no form until a restaurant is selected', () => {
    setInputs({ restaurants: [restaurant()] });

    expect(query('admin-restaurant-ownership-form')).toBeNull();
  });

  // The picker exists so that an assignment cannot name an account that could
  // not act on the restaurant afterwards.
  it('offers only accounts holding the business role', () => {
    setInputs({
      restaurants: [restaurant()],
      accounts: [
        account(),
        account({ uid: 'u2', email: 'staff@example.com', roles: ['staff'] }),
        account({ uid: 'u3', email: 'nobody@example.com', roles: [] }),
      ],
      selected: restaurant(),
    });

    expect(component.assignableAccounts().map((a) => a.uid)).toEqual([
      'owner-1',
    ]);
  });

  it('filters the offered accounts on email, display name and uid', () => {
    setInputs({
      accounts: [
        account(),
        account({ uid: 'u2', email: 'other@example.com', displayName: 'Mia' }),
      ],
      selected: restaurant(),
    });

    component.onAccountFilterChange('mia');

    expect(component.assignableAccounts().map((a) => a.uid)).toEqual(['u2']);
  });

  it('refuses to assign until an account and a reason are given', () => {
    setInputs({ accounts: [account()], selected: restaurant() });

    expect(component.canAssign()).toBe(false);

    component.onOwnerChange('owner-1');

    expect(component.canAssign()).toBe(false);

    component.onReasonChange('  ');

    expect(component.canAssign()).toBe(false);

    component.onReasonChange('Verified on the phone.');

    expect(component.canAssign()).toBe(true);
  });

  it('emits the restaurant, the account and the trimmed reason', () => {
    const emitted: unknown[] = [];
    component.assign.subscribe((event) => emitted.push(event));
    setInputs({ accounts: [account()], selected: restaurant() });

    component.onOwnerChange('owner-1');
    component.onReasonChange('  Verified on the phone.  ');
    component.onAssign();

    expect(emitted).toEqual([
      {
        restaurantId: 'r1',
        ownerUserId: 'owner-1',
        reason: 'Verified on the phone.',
      },
    ]);
  });

  // Reassignment is revoke and then assign, so the log carries two decisions.
  // An assigned restaurant therefore offers no picker and no assign button.
  it('offers no account picker for a restaurant that already has an owner', () => {
    setInputs({
      accounts: [account()],
      selected: restaurant({ ownerUserId: 'owner-1', claimStatus: 'claimed' }),
    });

    expect(query('admin-restaurant-accounts')).toBeNull();
    expect(query('admin-restaurant-assign')).toBeNull();
    expect(query('admin-restaurant-reassign-hint')).not.toBeNull();
  });

  it('names the owner rather than showing a bare uid when the account is known', () => {
    setInputs({
      accounts: [account()],
      selected: restaurant({ ownerUserId: 'owner-1', claimStatus: 'claimed' }),
    });

    expect(query('admin-restaurant-owner')?.textContent).toContain(
      'owner@example.com',
    );
  });

  it('falls back to the uid for an owner whose account is no longer listed', () => {
    setInputs({
      accounts: [],
      selected: restaurant({ ownerUserId: 'owner-1', claimStatus: 'claimed' }),
    });

    expect(query('admin-restaurant-owner')?.textContent).toContain('owner-1');
  });

  it('reads a missing claim status as unclaimed', () => {
    expect(component.claimStatusOf(restaurant())).toBe('unclaimed');
    expect(component.claimStatusKey(restaurant())).toBe(
      'admin-restaurant-ownership-status-unclaimed',
    );
  });

  it('refuses to revoke until a reason is given', () => {
    setInputs({
      selected: restaurant({ ownerUserId: 'owner-1', claimStatus: 'claimed' }),
    });

    expect(component.canRevoke()).toBe(false);

    component.onReasonChange('Restaurant closed.');

    expect(component.canRevoke()).toBe(true);
  });

  it('confirms before revoking, and emits only when the confirmation is taken', async () => {
    const emitted: unknown[] = [];
    component.revoke.subscribe((event) => emitted.push(event));
    setInputs({
      accounts: [account()],
      selected: restaurant({ ownerUserId: 'owner-1', claimStatus: 'claimed' }),
    });
    component.onReasonChange('Restaurant closed.');

    await component.onRevoke();

    expect(emitted).toEqual([]);
    expect(lastAlert().subHeader).toContain('owner@example.com');

    pressAlertButton('destructive');

    expect(emitted).toEqual([
      { restaurantId: 'r1', reason: 'Restaurant closed.' },
    ]);
  });

  it('does not open the confirmation when no reason was given', async () => {
    setInputs({
      selected: restaurant({ ownerUserId: 'owner-1', claimStatus: 'claimed' }),
    });

    await component.onRevoke();

    expect(alerts).toEqual([]);
  });

  it('clears the draft owner and the reason when another restaurant is selected', () => {
    setInputs({ accounts: [account()], selected: restaurant() });
    component.onOwnerChange('owner-1');
    component.onReasonChange('Verified on the phone.');

    component.onSelect(restaurant({ id: 'r2', name: 'Cafe Central' }));
    setInputs({ selected: restaurant({ id: 'r2', name: 'Cafe Central' }) });

    expect(component.draftOwnerUserId()).toBeUndefined();
    expect(component.reason()).toBe('');
  });

  it('distinguishes an empty collection from a filter that matches nothing', () => {
    setInputs({ restaurants: [] });

    expect(component.filtered()).toBe(false);

    component.onFilterChange('nothing');

    expect(component.filtered()).toBe(true);
  });
});
