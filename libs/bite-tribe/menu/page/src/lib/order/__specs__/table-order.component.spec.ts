import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  WritableSignal,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import type { Menu, MenuItem, TableScanContext } from 'model';
import {
  TableCartService,
  TableOrderService,
  type TableOrderRefusal,
  type TableOrderView,
} from 'bite-tribe/table-order-data-access';
import { TableOrder } from '../table-order.component';

jest.mock('@capacitor-firebase/analytics');

addNecessaryIcons();

/**
 * What a guest at a table actually sees (GitHub issue #1103).
 *
 * The assertions that earn this file are about the screen rather than the cart:
 * that the running total is on it while the menu is being read, that a refusal
 * names the dish it is about rather than saying something went wrong, and that
 * the refusal does not take the menu and the cart away with it.
 */

const MARGHERITA: MenuItem = {
  id: 'item-margherita',
  name: 'Margherita',
  description: 'Tomato and mozzarella',
  price: 12,
};

const MENU: Menu = {
  id: 'menu-1',
  currency: 'EUR',
  categories: [{ id: 'category-1', title: 'Pizza', items: [MARGHERITA] }],
};

const CONTEXT: TableScanContext = {
  token: 'ABCDEFGHJKMNPQRSTVWXYZ0123',
  restaurant: { id: 'restaurant-1', name: 'Sakura Kitchen' },
  room: { id: 'room-1', name: 'Main dining room' },
  table: { id: 'table-12', label: '12', seats: 4 },
  menu: { id: 'menu-1' },
  ordering: { available: true },
};

const ORDERING: TableOrderView = {
  kind: 'ordering',
  context: CONTEXT,
  menu: MENU,
  currency: 'EUR',
};

const en = {
  'table-order-loading': 'Getting the menu...',
  'table-order-heading': 'Ordering at {{restaurant}}, table {{table}}',
  'table-order-add': 'Add',
  'table-order-cart-heading': 'Your order',
  'table-order-cart-empty': 'Nothing yet.',
  'table-order-remove': 'Remove',
  'table-order-increase': 'One more',
  'table-order-decrease': 'One fewer',
  'table-order-notes': 'Anything to add?',
  'table-order-notes-hint': 'No onions...',
  'table-order-total': 'Total {{total}}',
  'table-order-send': 'Send to the kitchen',
  'table-order-placed-heading': 'Your order is with the kitchen',
  'table-order-placed-intro': '{{restaurant}} has it for table {{table}}.',
  'table-order-placed-total': 'Total {{total}}',
  'table-order-status-soon': 'Following your order is on its way.',
  'table-order-again': 'Order something else',
  'table-order-blocked-title': "You can't order here right now",
  'table-order-blocked-menuCurrencyMissing': 'This menu states no currency.',
  'table-order-price-was': 'It was {{was}} and it is now {{now}}.',
  'table-order-refused-itemUnavailable':
    "{{item}} isn't available right now. Take it out and send the rest.",
  'table-order-refused-priceChanged':
    'The price of {{item}} has changed. Check it and send again.',
  'table-session-menu-only-paused': 'They have paused new orders.',
  'table-session-next-tryLater': 'Try again in a little while.',
  'table-session-browse-menu': 'Read the menu',
  'table-session-try-again': 'Try again',
  'table-session-failed-title': "We couldn't reach the restaurant",
  'table-session-failed-offline': "Your phone couldn't get through.",
  'menu-item-not-available': 'Not available',
  'create-bite': 'Create Bite',
  'no-menu-yet': 'No menu yet',
};

describe(TableOrder.name, () => {
  let fixture: ComponentFixture<TableOrder>;
  let state: WritableSignal<TableOrderView>;
  let lastRefusal: WritableSignal<TableOrderRefusal | undefined>;
  let cart: TableCartService;
  let load: jest.Mock;
  let submit: jest.Mock;

  const show = (next: TableOrderView): void => {
    state.set(next);
    fixture.detectChanges();
  };

  const render = (): void => {
    fixture = TestBed.createComponent(TableOrder);
    fixture.detectChanges();
  };

  const text = (): string => fixture.nativeElement.textContent ?? '';

  const has = (testId: string): boolean =>
    !!fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const click = (testId: string): void => {
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`)?.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    state = signal<TableOrderView>({ kind: 'loading' });
    lastRefusal = signal<TableOrderRefusal | undefined>(undefined);
    load = jest.fn().mockResolvedValue(undefined);
    submit = jest.fn().mockResolvedValue(undefined);

    // Constructed rather than injected: the real cart is wanted here - the
    // screen's job is to render what it holds - and only the service around it
    // is faked. `TableCartService` reaches for nothing, so `new` is the whole
    // of its construction.
    cart = new TableCartService();

    const service = {
      cart,
      state,
      lastRefusal,
      isBusy: signal(false),
      canSubmit: signal(true),
      load,
      submit,
      retry: jest.fn(),
      orderAgain: jest.fn(),
      add: (selection: { item: MenuItem; variant?: MenuItem }): void =>
        cart.add(selection.item, selection.variant),
      increase: (key: string): void => cart.increase(key),
      decrease: (key: string): void => cart.decrease(key),
      remove: (key: string): void => cart.remove(key),
      setNotes: (key: string, notes: string): void => cart.setNotes(key, notes),
    };

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en },
          translocoConfig: {
            availableLangs: ['en'],
            defaultLang: 'en',
            fallbackLang: 'en',
            reRenderOnLangChange: true,
          },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(getIonicConfig()),
        provideRouter([]),
        { provide: TableOrderService, useValue: service },
      ],
    })
      // The component provides the real service, which would win over the fake
      // above. Emptying its own list is how the public menu spec next door
      // substitutes its service too.
      .overrideComponent(TableOrder, { set: { providers: [] } })
      .compileComponents();
  });

  it('loads as soon as it opens', () => {
    render();

    expect(load).toHaveBeenCalled();
    expect(has('table-order-loading')).toBe(true);
  });

  it('names the restaurant and the table it is ordering for', () => {
    render();
    show(ORDERING);

    expect(text()).toContain('Ordering at Sakura Kitchen, table 12');
  });

  /**
   * The menu on this screen is the same renderer the public menu uses, with the
   * "add" button turned on and the Bite button off - the guest may have no
   * BiteTribe account at all.
   */
  it('offers an add button and no Bite button', () => {
    render();
    show(ORDERING);

    expect(has('menu-item-add-to-cart')).toBe(true);
    expect(text()).not.toContain('Create Bite');
  });

  it('says the cart is empty before anything is in it', () => {
    render();
    show(ORDERING);

    expect(has('table-order-cart-empty')).toBe(true);
    expect(text()).toContain('Total 0 €');
  });

  /**
   * The running total stays in view while the guest scrolls the menu. A total
   * they have to scroll to find is a total they stop reading.
   */
  it('adds a dish to the cart and shows the running total', () => {
    render();
    show(ORDERING);

    click('menu-item-add-to-cart');

    expect(text()).toContain('Margherita');
    expect(text()).toContain('Total 12 €');
  });

  it('raises and lowers a row from the cart', () => {
    render();
    show(ORDERING);
    click('menu-item-add-to-cart');

    click('cart-line-increase');

    expect(text()).toContain('Total 24 €');

    click('cart-line-decrease');

    expect(text()).toContain('Total 12 €');
  });

  it('removes a row outright', () => {
    render();
    show(ORDERING);
    click('menu-item-add-to-cart');

    click('cart-line-remove');

    expect(has('table-order-cart-empty')).toBe(true);
  });

  it('sends the cart when the guest taps send', () => {
    render();
    show(ORDERING);
    click('menu-item-add-to-cart');

    click('table-order-submit');

    expect(submit).toHaveBeenCalled();
  });

  /**
   * The acceptance criterion, as the guest reads it: the dish is named, so they
   * know which row to take out.
   */
  it('names the dish a refusal is about, over the menu it is still reading', () => {
    render();
    show(ORDERING);
    click('menu-item-add-to-cart');

    lastRefusal.set({
      reason: 'itemUnavailable',
      item: { menuItemId: MARGHERITA.id, name: 'Margherita' },
    });
    fixture.detectChanges();

    expect(text()).toContain("Margherita isn't available right now");
    // The menu and the cart are still on screen, which is the whole point.
    expect(has('table-order-menu')).toBe(true);
    expect(has('cart-line')).toBe(true);
  });

  /**
   * A price refusal names both numbers. "The price changed" without them leaves
   * the guest to find the difference by comparing two screens.
   */
  it('shows both prices when one has moved', () => {
    render();
    show(ORDERING);
    click('menu-item-add-to-cart');

    lastRefusal.set({
      reason: 'priceChanged',
      item: {
        menuItemId: MARGHERITA.id,
        name: 'Margherita',
        shownPrice: 12,
        currentPrice: 14,
      },
    });
    fixture.detectChanges();

    expect(text()).toContain('It was 12 € and it is now 14 €');
  });

  /**
   * A dish deleted from the menu has no name left on it, so the sentence falls
   * back to the name in the guest's own cart - they still have to know which
   * row to take out.
   */
  it('falls back to the cart name for an item the menu no longer has', () => {
    render();
    show(ORDERING);
    click('menu-item-add-to-cart');

    lastRefusal.set({
      reason: 'itemUnavailable',
      item: { menuItemId: MARGHERITA.id },
    });
    fixture.detectChanges();

    expect(text()).toContain("Margherita isn't available right now");
  });

  /**
   * The total on the confirmation is priced from the *order's* currency rather
   * than the menu's: the menu state is gone by the time this renders, and the
   * one figure the guest just agreed to must not appear as a bare number.
   */
  it('confirms the order and its total once it lands', () => {
    render();

    show({
      kind: 'placed',
      context: CONTEXT,
      order: { total: 24, currency: 'EUR' } as never,
    });

    expect(text()).toContain('Your order is with the kitchen');
    expect(text()).toContain('Sakura Kitchen has it for table 12.');
    expect(text()).toContain('Total 24 €');
    expect(has('table-order-again')).toBe(true);
  });

  it('offers the menu when ordering is blocked but reading is not', () => {
    render();

    show({
      kind: 'blocked',
      reason: 'orderingPaused',
      restaurantId: CONTEXT.restaurant.id,
    });

    expect(text()).toContain('They have paused new orders.');
    expect(has('table-order-browse-menu')).toBe(true);
  });

  it('renders the next step of a refused scan', () => {
    render();

    show({
      kind: 'blocked',
      reason: 'restaurantClosed',
      nextStep: 'tryLater',
      restaurantId: '',
    });

    expect(text()).toContain('Try again in a little while.');
    expect(has('table-order-browse-menu')).toBe(false);
  });

  /**
   * A dropped connection is not a refusal and is worded differently: it is
   * about the phone rather than about the restaurant.
   */
  it('apologises only for the transport failing', () => {
    render();

    show({ kind: 'failed', failure: 'offline' });

    expect(text()).toContain("Your phone couldn't get through.");
  });

  it('reports the screen to analytics', () => {
    render();

    fixture.componentInstance.ionViewDidEnter();

    expect(FirebaseAnalytics.setCurrentScreen).toHaveBeenCalledWith({
      screenName: 'Table Order',
    });
  });
});
