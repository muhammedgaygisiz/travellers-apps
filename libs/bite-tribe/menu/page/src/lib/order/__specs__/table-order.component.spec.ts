import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  WritableSignal,
  computed,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { tableOrdersTotal } from 'model';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import type {
  Menu,
  MenuItem,
  TableOrder as TableOrderModel,
  TableScanContext,
  TableSessionStatus,
} from 'model';
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
  'table-order-your-orders': 'Your orders',
  'table-order-status-submitted': 'Sent to the kitchen',
  'table-order-status-preparing': 'Being made',
  'table-order-status-served': 'Served',
  'table-order-status-accepted': 'The kitchen has taken it',
  'table-order-status-cancelled': 'Cancelled',
  'table-order-cancelled-reason': 'The restaurant said: {{reason}}',
  'table-order-cancelled-no-reason': 'The restaurant cancelled this one.',
  'table-order-orders-total': 'Ordered so far {{total}}',
  'table-order-status-stale': "We've lost touch with the restaurant.",
  'table-order-refused-sessionNotActive': 'Your table has been closed.',
  'table-session-pending-intro':
    'Ordering opens when staff confirm your table.',
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
  'table-assistance-heading': 'Need something?',
  'table-assistance-callStaff-idle': 'Call a waiter',
  'table-assistance-callStaff-open': 'A waiter has been called',
  'table-assistance-callStaff-acknowledged': 'Somebody is on their way.',
  'table-assistance-requestBill-idle': 'Ask for the bill',
  'table-assistance-requestBill-open': 'The bill has been asked for',
  'table-assistance-requestBill-acknowledged': 'Your bill is on its way.',
  'table-assistance-refused-cooldown':
    "You've only just asked. Give them a moment before asking again.",
  'table-assistance-stale': "We've lost touch with the restaurant.",
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
  let orders: WritableSignal<TableOrderModel[]>;
  let sessionStatus: WritableSignal<TableSessionStatus | undefined>;
  let isStale: WritableSignal<boolean>;
  let assistanceState: WritableSignal<
    Record<'callStaff' | 'requestBill', 'idle' | 'open' | 'acknowledged'>
  >;
  let assistanceRefusal: WritableSignal<{ reason: 'cooldown' } | undefined>;
  let assistanceStale: WritableSignal<boolean>;
  let ask: jest.Mock;

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
    orders = signal<TableOrderModel[]>([]);
    sessionStatus = signal<TableSessionStatus | undefined>('active');
    isStale = signal(false);
    assistanceState = signal({
      callStaff: 'idle' as const,
      requestBill: 'idle' as const,
    });
    assistanceRefusal = signal<{ reason: 'cooldown' } | undefined>(undefined);
    assistanceStale = signal(false);
    ask = jest.fn().mockResolvedValue(undefined);

    // The history is signals all the way down, so the fake is the four the
    // template reads. What is being checked here is what a guest sees, and the
    // chain of listeners behind those signals has its own spec.
    const history = {
      orders,
      hasOrders: computed(() => orders().length > 0),
      total: computed(() => tableOrdersTotal(orders())),
      status: sessionStatus,
      isStale,
      // The same predicate the send button uses: a table the restaurant closed
      // and a party staff have not seated are exactly the states in which the
      // backend refuses a signal (GitHub issue #1106).
      acceptsOrders: computed(
        () => sessionStatus() === undefined || sessionStatus() === 'active',
      ),
    };

    // Signals all the way down, like the history: what is checked here is what
    // a guest sees, and the listeners behind them have their own spec.
    const assistance = {
      busy: signal<'callStaff' | 'requestBill' | undefined>(undefined),
      lastRefusal: assistanceRefusal,
      lastFailure: signal<string | undefined>(undefined),
      isStale: assistanceStale,
      stateOf: (kind: 'callStaff' | 'requestBill'): string =>
        assistanceState()[kind],
      ask,
    };

    const service = {
      cart,
      history,
      assistance,
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

  /**
   * What the guest ordered, where it has got to, and whether they can send
   * another (GitHub issue #1104).
   */
  describe('the orders already sent', () => {
    const sent = (over: Partial<TableOrderModel> = {}): TableOrderModel =>
      ({
        id: 'order-1',
        status: 'submitted',
        currency: 'EUR',
        total: 12,
        submittedAt: 1_757_664_000_000,
        lines: [
          {
            menuItemId: MARGHERITA.id,
            name: 'Margherita',
            price: 12,
            currency: 'EUR',
            quantity: 1,
          },
        ],
        ...over,
      }) as TableOrderModel;

    it('shows nothing at all before the guest has ordered', () => {
      render();
      show(ORDERING);

      expect(has('table-order-history')).toBe(false);
    });

    it('lists an order with its status, its lines and its total', () => {
      render();
      orders.set([sent({ status: 'preparing' })]);
      show(ORDERING);

      expect(text()).toContain('Your orders');
      expect(text()).toContain('Being made');
      expect(text()).toContain('1 × Margherita');
      expect(text()).toContain('12 €');
    });

    /**
     * The same list, on the confirmation as well as on the menu. A guest who
     * has just sent a second round is looking at the same orders.
     */
    it('shows the list on the confirmation too', () => {
      render();
      orders.set([sent()]);

      show({
        kind: 'placed',
        context: CONTEXT,
        order: { total: 12, currency: 'EUR' } as never,
      });

      expect(has('table-order-history')).toBe(true);
      expect(text()).toContain('Sent to the kitchen');
    });

    it('follows a status change without anything being tapped', () => {
      render();
      orders.set([sent()]);
      show(ORDERING);

      expect(text()).toContain('Sent to the kitchen');

      orders.set([sent({ status: 'served' })]);
      fixture.detectChanges();

      expect(text()).toContain('Served');
      expect(text()).not.toContain('Sent to the kitchen');
    });

    /** Cancellations are explained, not silent. */
    it('explains a cancellation in the words staff used', () => {
      render();
      orders.set([
        sent({
          status: 'cancelled',
          cancellationReason: 'We have run out of mozzarella',
        }),
      ]);
      show(ORDERING);

      expect(text()).toContain('Cancelled');
      expect(text()).toContain(
        'The restaurant said: We have run out of mozzarella',
      );
    });

    it('still names a cancellation staff gave no reason for', () => {
      render();
      orders.set([sent({ status: 'cancelled' })]);
      show(ORDERING);

      expect(text()).toContain('The restaurant cancelled this one.');
    });

    /** Its own total already says it, one line higher up. */
    it('adds no running total under a single order', () => {
      render();
      orders.set([sent()]);
      show(ORDERING);

      expect(has('table-order-running-total')).toBe(false);
    });

    it('runs a total across several orders, cancelled ones excluded', () => {
      render();
      orders.set([
        sent(),
        sent({ id: 'order-2', total: 30 }),
        sent({ id: 'order-3', status: 'cancelled', total: 99 }),
      ]);
      show(ORDERING);

      expect(text()).toContain('Ordered so far 42 €');
    });

    /**
     * A status screen that has quietly stopped updating is worse than an empty
     * one: the guest reads an hour-old `submitted` as though it were current.
     */
    it('warns when it may be showing something out of date', () => {
      render();
      orders.set([sent()]);
      isStale.set(true);
      show(ORDERING);

      expect(has('table-order-stale')).toBe(true);
    });
  });

  describe('a table that stops taking orders', () => {
    it('says nothing while the session is active', () => {
      render();
      show(ORDERING);

      expect(has('table-order-closed')).toBe(false);
    });

    it('says the table has been closed, above the menu', () => {
      render();
      sessionStatus.set('closed');
      show(ORDERING);

      expect(text()).toContain('Your table has been closed.');
      expect(has('table-order-menu')).toBe(true);
    });

    /** The same sentence on the confirmation, where a guest sits after sending. */
    it('says it on the confirmation as well as on the menu', () => {
      render();
      sessionStatus.set('closed');

      show({
        kind: 'placed',
        context: CONTEXT,
        order: { total: 12, currency: 'EUR' } as never,
      });

      expect(has('table-order-closed')).toBe(true);
    });

    it('says ordering opens when staff confirm the table', () => {
      render();
      sessionStatus.set('pending');
      show(ORDERING);

      expect(text()).toContain('Ordering opens when staff confirm your table.');
    });
  });

  describe('asking for a waiter or the bill', () => {
    it('offers both, named for what they do', () => {
      render();
      show(ORDERING);

      expect(has('table-assistance')).toBe(true);
      expect(text()).toContain('Call a waiter');
      expect(text()).toContain('Ask for the bill');
    });

    it('sends the request when the guest taps one', () => {
      render();
      show(ORDERING);
      click('table-assistance-callStaff');

      expect(ask).toHaveBeenCalledWith('callStaff');
    });

    /**
     * The signal is up, so the button says so and stops being pressable: the
     * tap the guest is about to make again would do nothing, and a button that
     * looks live is what makes people make it.
     */
    it('says a waiter has been called and stops taking taps', () => {
      render();
      assistanceState.set({ callStaff: 'open', requestBill: 'idle' });
      show(ORDERING);

      expect(text()).toContain('A waiter has been called');
      // The property rather than the attribute: `ion-button` keeps `disabled`
      // as a property and mirrors it to `aria-disabled`, which is also what the
      // business e2e suite had to learn to assert on.
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="table-assistance-callStaff"]',
        )?.disabled,
      ).toBe(true);
    });

    /**
     * The second half of "the guest sees that their request was received and
     * then acknowledged": the button goes back to its ordinary label, because
     * the guest may need somebody again, and the note says somebody is coming.
     */
    it('says somebody is on their way once staff answer', () => {
      render();
      assistanceState.set({ callStaff: 'acknowledged', requestBill: 'idle' });
      show(ORDERING);

      expect(has('table-assistance-callStaff-note')).toBe(true);
      expect(text()).toContain('Somebody is on their way.');
      expect(text()).toContain('Call a waiter');
    });

    it('explains a request that came back refused', () => {
      render();
      assistanceRefusal.set({ reason: 'cooldown' });
      show(ORDERING);

      expect(text()).toContain("You've only just asked.");
    });

    it('warns when the answer may be out of date', () => {
      render();
      assistanceStale.set(true);
      show(ORDERING);

      expect(has('table-assistance-stale')).toBe(true);
    });

    /**
     * A table the restaurant closed cannot be answered, and a button that is
     * always there and always refused teaches a guest to ignore the screen.
     */
    it('withdraws both when the table has been closed', () => {
      render();
      sessionStatus.set('closed');
      show(ORDERING);

      expect(has('table-assistance')).toBe(false);
    });

    /** A guest who has sent an order sits on the confirmation, and still waves. */
    it('offers them on the confirmation too', () => {
      render();

      show({
        kind: 'placed',
        context: CONTEXT,
        order: { total: 12, currency: 'EUR' } as never,
      });

      expect(has('table-assistance')).toBe(true);
    });
  });

  it('reports the screen to analytics', () => {
    render();

    fixture.componentInstance.ionViewDidEnter();

    expect(FirebaseAnalytics.setCurrentScreen).toHaveBeenCalledWith({
      screenName: 'Table Order',
    });
  });
});
