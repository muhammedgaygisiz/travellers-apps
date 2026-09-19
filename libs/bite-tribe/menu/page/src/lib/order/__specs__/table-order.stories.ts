/* eslint-disable @nx/enforce-module-boundaries -- see the note below */
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import {
  applicationConfig,
  Decorator,
  Meta,
  StoryObj,
} from '@storybook/angular';
import {
  BiteTribeApiService,
  TableAssistanceApiService,
  TableOrderApiService,
  TableSessionApiService,
  type TableSessionCallError,
  type TableSessionCallFailure,
} from 'bite-tribe/api';
import { AuthService } from 'ta-firestore';
import { NetworkStatusService } from 'common/networkstatus';
import type {
  PublicMenuRefusalReason,
  SubmitTableOrderResult,
  TableOrder as TableOrderModel,
  PublicMenuResult,
  TableOrderingUnavailableReason,
  TableScanContext,
  TableScanRefusalReason,
  TableScanResult,
} from 'model';
import { TABLE_SCAN_NEXT_STEPS } from 'model';
import { EMPTY, Observable, of } from 'rxjs';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { TableOrder } from '../table-order.component';

addNecessaryIcons();

/**
 * The ordering screen, in every state it can be in (GitHub issue #1660).
 *
 * ## Faked at the transport, like the scan screen
 *
 * `TableOrder` provides five services at its own node injector, so an
 * application-level `useValue` cannot shadow any of them. Each story therefore
 * provides what those services inject - the three API surfaces, the auth and
 * network services, and a route carrying the token - and the real services run.
 *
 * What is photographed is the state the shipped code reaches from an answer the
 * backend really gives. A blocked reason that lost its sentence would render as
 * a heading over a blank line, and that is exactly what these catch.
 *
 * ## Why this file suppresses the module boundary
 *
 * The same reason `table-session.stories.ts` does, and written out there: a
 * `type:feature` library may reach the API only through `type:data-access`, the
 * state to photograph is decided by the transport, and the component owns its
 * services. Nothing here ships.
 */

const context: TableScanContext = {
  token: 'ABCDEFGHJKMNPQRSTVWXYZ0123',
  restaurant: { id: 'sakura-kitchen', name: 'Sakura Kitchen' },
  room: { id: 'dining-room', name: 'Main dining room' },
  table: { id: 'table-12', label: '12', seats: 4 },
  menu: { id: 'menu-1' },
  ordering: { available: true },
};

/** A menu with enough on it to fill a phone and one dish marked off. */
const menu = {
  id: 'menu-1',
  currency: 'EUR',
  categories: [
    {
      id: 'category-pizza',
      title: 'Pizza',
      items: [
        {
          id: 'item-margherita',
          name: 'Margherita',
          description: 'Tomato, mozzarella, basil',
          price: 12,
        },
        {
          id: 'item-diavola',
          name: 'Diavola',
          description: 'Spicy salami, tomato, mozzarella',
          price: 14.5,
        },
        {
          id: 'item-tartufo',
          name: 'Tartufo',
          description: 'Truffle cream, mushrooms - off the menu today',
          price: 18,
          isAvailable: false,
        },
      ],
    },
    {
      id: 'category-dolci',
      title: 'Dolci',
      items: [
        {
          id: 'item-tiramisu',
          name: 'Tiramisù',
          description: 'Mascarpone, espresso, cocoa',
          price: 7,
        },
      ],
    },
  ],
};

/**
 * The menu as the public callable answers it.
 *
 * `currency` is a required argument rather than one defaulting to `EUR`:
 * `publicMenu(undefined)` would take the default and hand back a priced menu,
 * which is the opposite of what the story asking for it wants - and it renders
 * as a working ordering screen, so the reference image looks plausible.
 */
const publicMenu = (currency: string | undefined): PublicMenuResult =>
  ({
    ok: true,
    restaurant: { id: context.restaurant.id, name: context.restaurant.name },
    menu: { ...menu, currency },
  }) as unknown as PublicMenuResult;

const resolved = (
  ordering: TableScanContext['ordering'] = { available: true },
): TableScanResult => ({ ok: true, ...context, ordering });

const pending = <T>(): Promise<T> => new Promise<T>(() => undefined);

interface Answers {
  scan?: () => Promise<TableScanResult | TableSessionCallError>;
  menu?: () => Promise<PublicMenuResult | undefined>;
  submit?: () => Promise<SubmitTableOrderResult | TableSessionCallError>;
}

const order = (answers: Answers = {}): Decorator =>
  applicationConfig({
    providers: [
      provideIonicAngular(getIonicConfig()),
      provideRouter([]),
      { provide: APP_TITLE, useValue: 'Bite Tribe' },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: { get: (): string => context.token } },
        },
      },
      {
        provide: TableSessionApiService,
        useValue: {
          resolveToken:
            answers.scan ??
            ((): Promise<TableScanResult | TableSessionCallError> =>
              Promise.resolve(resolved())),
          session$: (): Observable<never> => EMPTY,
        },
      },
      {
        provide: BiteTribeApiService,
        useValue: {
          loadPublicMenu:
            answers.menu ??
            ((): Promise<PublicMenuResult | undefined> =>
              Promise.resolve(publicMenu('EUR'))),
        },
      },
      {
        provide: TableOrderApiService,
        useValue: {
          orders$: (): Observable<never> => EMPTY,
          submit:
            answers.submit ??
            ((): Promise<SubmitTableOrderResult | TableSessionCallError> =>
              pending()),
        },
      },
      {
        provide: TableAssistanceApiService,
        useValue: {
          request$: (): Observable<unknown> => of({}),
          request: (): Promise<never> => pending(),
        },
      },
      // No uid, so the history listener returns before it subscribes: a guest
      // who has not confirmed a table has ordered nothing to show.
      {
        provide: AuthService,
        useValue: { getUser: (): undefined => undefined },
      },
      {
        provide: NetworkStatusService,
        useValue: {
          status: (): { connected: boolean } => ({ connected: true }),
        },
      },
    ],
  });

/** Two frames, or a play function photographs the state before the click. */
const settle = async (): Promise<void> => {
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
};

const pressAll = async (testId: string, times = 1): Promise<void> => {
  await settle();
  const buttons = document.querySelectorAll<HTMLElement>(
    `[data-testid="${testId}"]`,
  );

  for (let i = 0; i < times && i < buttons.length; i++) {
    buttons[i].click();
    await settle();
  }
};

export default {
  title: 'Pages/Table Order',
  component: TableOrder,
  /**
   * The cart is kept on the phone, keyed by restaurant and table, and survives
   * a reload by design (`RD-TS-33`). In one browser running every story in
   * sequence that means the cart one story builds is still there for the next,
   * which put two lines under a blocked screen that should have had none.
   *
   * Cleared before each story rather than given each story its own table:
   * `Preferences` is `localStorage` on the web, so this is the same slate the
   * first guest of the day gets.
   */
  loaders: [
    async (): Promise<void> => {
      try {
        localStorage.clear();
      } catch {
        // A browser that refuses storage is the case the cart already tolerates.
      }
    },
  ],
} as Meta<TableOrder>;

type Story = StoryObj<TableOrder>;

/** The token is being resolved and the menu fetched. */
export const Loading: Story = {
  decorators: [order({ scan: () => pending() })],
};

/** Ready. The guest browses, and one dish is off the menu today. */
export const Ordering: Story = {
  decorators: [order()],
};

/** Two dishes chosen. The cart is on the phone and never reaches Firestore. */
export const CartWithLines: Story = {
  decorators: [order()],
  play: () => pressAll('menu-item-add-to-cart', 2),
};

const blockedByScan = (reason: TableScanRefusalReason): Story => ({
  decorators: [
    order({
      scan: async () => ({
        ok: false,
        reason,
        nextStep: TABLE_SCAN_NEXT_STEPS[reason],
      }),
    }),
  ],
});

const blockedByOrdering = (reason: TableOrderingUnavailableReason): Story => ({
  decorators: [
    order({
      scan: async () =>
        resolved(
          reason === 'orderingPaused'
            ? {
                available: false,
                reason,
                pausedUntilTimestamp: Date.parse('2026-09-19T20:20:00Z'),
              }
            : { available: false, reason },
        ),
    }),
  ],
});

const blockedByMenu = (reason: PublicMenuRefusalReason): Story => ({
  decorators: [
    order({
      menu: async () => ({ ok: false, reason }) as PublicMenuResult,
    }),
  ],
});

/**
 * A menu-only restaurant, reached by walking back to the ordering screen. The
 * question is asked again rather than assumed from the screen that sent the
 * guest here, so a kitchen that paused in between is not offering an add
 * button.
 */
export const BlockedOrderingDisabled = blockedByOrdering(
  'tableOrderingDisabled',
);

/** The kitchen paused while the guest walked back to their table. */
export const BlockedOrderingPaused = blockedByOrdering('orderingPaused');

/** Nothing on the menu can be ordered today. */
export const BlockedMenuUnavailable = blockedByScan('menuUnavailable');

/** Shut. A statement about the restaurant rather than about ordering. */
export const BlockedRestaurantClosed = blockedByScan('restaurantClosed');

/** The code was replaced, and the working one is on the table. */
export const BlockedTokenSuperseded = blockedByScan('tokenSuperseded');

/** A menu with nothing written on it - the weaker rule the link path applies. */
export const BlockedMenuEmpty = blockedByMenu('menuEmpty');

/**
 * A menu that states no currency can be read and cannot be ordered from: a line
 * has to record what it charged, and the alternative is guessing a currency and
 * printing it on a receipt. The one blocked reason no other screen has.
 */
export const BlockedMenuCurrencyMissing: Story = {
  decorators: [order({ menu: async () => publicMenu(undefined) })],
};

const failed = (failure: TableSessionCallFailure): Story => ({
  decorators: [order({ scan: async () => ({ ok: false, failure }) })],
});

/** The call never got an answer. Not a refusal, and worded differently. */
export const FailedOffline = failed('offline');

/** The same code has been hammered, and the rate limiter said so. */
export const FailedRateLimited = failed('rateLimited');

/** One Margherita, as the kitchen would have recorded it. */
const placedOrder = (): TableOrderModel =>
  ({
    id: 'req-9f2a',
    visitId: 'visit-1',
    tableId: context.table.id,
    status: 'received',
    currency: 'EUR',
    total: 12,
    lines: [
      {
        menuItemId: 'item-margherita',
        name: 'Margherita',
        price: 12,
        quantity: 1,
      },
    ],
    statusChangedAt: Date.parse('2026-09-19T19:40:00Z'),
  }) as unknown as TableOrderModel;

/** Adds one dish and taps send. */
const sendOne = async (): Promise<void> => {
  await pressAll('menu-item-add-to-cart', 1);
  await pressAll('table-order-submit', 1);
};

/** Sent, and the kitchen has it. */
export const Placed: Story = {
  decorators: [
    order({
      submit: async () => ({
        ok: true,
        order: placedOrder(),
        tableStatus: 'ordering',
      }),
    }),
  ],
  play: sendOne,
};

/**
 * The same order, found rather than placed (issue #1108). A guest whose phone
 * gave up and retried is told it was already with the kitchen rather than shown
 * a second confirmation of an order they placed once.
 */
export const PlacedReplayed: Story = {
  decorators: [
    order({
      submit: async () => ({
        ok: true,
        order: placedOrder(),
        tableStatus: 'ordering',
        replayed: true,
      }),
    }),
  ],
  play: sendOne,
};

/**
 * A dish was repriced while the guest read its description, so the whole order
 * is refused by name. The refusal sits **beside** the cart rather than
 * replacing it: a guest told their Margherita changed price needs the cart they
 * built and the menu they built it from, both still on screen.
 */
export const RefusedBesideCart: Story = {
  decorators: [
    order({
      submit: async () => ({
        ok: false,
        reason: 'priceChanged',
        item: {
          menuItemId: 'item-margherita',
          name: 'Margherita',
          shownPrice: 12,
          currentPrice: 13.5,
        },
      }),
    }),
  ],
  play: sendOne,
};

/**
 * A send that never came back. The cart and the menu stay put and the cart
 * stops accepting edits (`RD-TS-32`): the key already names an order that does
 * not contain whatever would be added to it, so a dessert added now is one that
 * can never be sent.
 */
export const SubmissionUnresolved: Story = {
  decorators: [order({ submit: () => pending() })],
  play: sendOne,
};
