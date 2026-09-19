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
  TableSessionApiService,
  type TableSessionCallError,
  type TableSessionCallFailure,
} from 'bite-tribe/api';
import type {
  StartTableSessionResult,
  TableScanContext,
  TableScanNextStep,
  TableScanRefusalReason,
  TableScanReopensAt,
  TableScanResult,
  TableSessionStatus,
} from 'model';
import { TABLE_SCAN_NEXT_STEPS } from 'model';
import { addNecessaryIcons, APP_TITLE, getIonicConfig } from 'utils';
import { TableSession } from '../table-session';

addNecessaryIcons();

/**
 * The scan screen, in every state it can be in (GitHub issue #1660).
 *
 * ## Why these are driven through the API and not through the service
 *
 * `TableSession` declares `providers: [TableSessionService]`, so the service is
 * constructed at the component's own node injector and an application-level
 * `useValue` cannot shadow it. Rather than fight that, each story provides the
 * two things the real service injects - `TableSessionApiService` and an
 * `ActivatedRoute` carrying the token - and lets the real state machine run.
 *
 * That is the better reference anyway: what is photographed is the state the
 * shipped code reaches from an answer the backend really gives, rather than a
 * state a fake was told to be in. A refusal reason that stopped being rendered
 * would fail here; a stubbed view model would not notice.
 *
 * ## Why this file suppresses the module boundary
 *
 * A `type:feature` library may reach the API only through `type:data-access`,
 * and that rule is right: the layering is what keeps a screen from calling a
 * callable directly. This file breaks it on purpose and in one place, because
 * the state to photograph is decided by the transport and the component owns
 * its service, so there is nowhere else to stand.
 *
 * Listed rather than silently permitted, in the spirit of the one entry in
 * `eslint.config.mjs`'s `allow` list. Two alternatives were considered: adding
 * `type:api` to what a feature may depend on, which weakens the rule for every
 * library to serve one story file; and re-exporting `TableSessionApiService`
 * from the data-access barrel, which widens a production surface for a test.
 * The suppression is the only one of the three that costs nothing outside this
 * file, and it is a story file - nothing here ships.
 *
 * ## The two states that need a click
 *
 * `joined` and `left` are only reachable through `confirm()` and `leave()`, so
 * their stories press the button the guest presses. Everything else is the
 * answer to one `resolveToken`.
 */

/** A table at a restaurant with a name long enough to wrap on a phone. */
const context: TableScanContext = {
  token: 'ABCDEFGHJKMNPQRSTVWXYZ0123',
  restaurant: { id: 'sakura-kitchen', name: 'Sakura Kitchen' },
  room: { id: 'dining-room', name: 'Main dining room' },
  table: { id: 'table-12', label: '12', seats: 4 },
  menu: { id: 'menu-1' },
  ordering: { available: true },
};

const resolved = (
  ordering: TableScanContext['ordering'] = { available: true },
): TableScanResult => ({ ok: true, ...context, ordering });

const refused = (
  reason: TableScanRefusalReason,
  reopensAt?: TableScanReopensAt,
): TableScanResult => ({
  ok: false,
  reason,
  nextStep: TABLE_SCAN_NEXT_STEPS[reason] as TableScanNextStep,
  ...(reopensAt ? { reopensAt } : {}),
});

const failed = (failure: TableSessionCallFailure): TableSessionCallError => ({
  ok: false,
  failure,
});

/** A promise that never settles, so the spinner is what gets photographed. */
const pending = <T>(): Promise<T> => new Promise<T>(() => undefined);

interface Answers {
  resolve: () => Promise<TableScanResult | TableSessionCallError>;
  start?: () => Promise<StartTableSessionResult | TableSessionCallError>;
  leave?: () => Promise<TableSessionStatus | TableSessionCallError>;
}

/**
 * The providers one story needs: a token in the route, and an API that answers
 * what that story is about.
 */
const scan = (answers: Answers): Decorator =>
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
          resolveToken: answers.resolve,
          start:
            answers.start ??
            ((): Promise<StartTableSessionResult | TableSessionCallError> =>
              pending()),
          leave:
            answers.leave ??
            ((): Promise<TableSessionStatus | TableSessionCallError> =>
              pending()),
        },
      },
    ],
  });

/** Two frames, or a play function photographs the state before the click. */
const settle = async (): Promise<void> => {
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
};

const press = async (testId: string): Promise<void> => {
  await settle();
  document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)?.click();
  await settle();
};

export default {
  title: 'Pages/Table Session',
  component: TableSession,
} as Meta<TableSession>;

type Story = StoryObj<TableSession>;

/** The first thing the guest sees, while the token is being resolved. */
export const Loading: Story = {
  decorators: [scan({ resolve: () => pending() })],
};

/**
 * Resolved. The guest is asked to confirm the restaurant and the table before
 * anything else is possible, because the sticker is a thing anybody can point a
 * camera at - so a code swapped between two tables is caught by the person
 * sitting at one of them.
 */
export const Confirm: Story = {
  decorators: [scan({ resolve: async () => resolved() })],
};

/** A table whose room was deleted. The line is dropped rather than left empty. */
export const ConfirmWithoutRoom: Story = {
  decorators: [
    scan({
      resolve: async () => ({
        ...(resolved() as Extract<TableScanResult, { ok: true }>),
        room: { id: 'dining-room' },
      }),
    }),
  ],
};

/**
 * A restaurant that publishes a menu and takes its orders from a person with a
 * notepad (issue #1102). There is nothing to confirm, so there is no confirm
 * button: the one thing the guest can do is read the menu.
 */
export const MenuOnlyDisabled: Story = {
  decorators: [
    scan({
      resolve: async () =>
        resolved({ available: false, reason: 'tableOrderingDisabled' }),
    }),
  ],
};

/** The kitchen has paused, and the screen says until when. */
export const MenuOnlyPaused: Story = {
  decorators: [
    scan({
      resolve: async () =>
        resolved({
          available: false,
          reason: 'orderingPaused',
          pausedUntilTimestamp: Date.parse('2026-09-19T20:20:00Z'),
        }),
    }),
  ],
};

/**
 * Attached, and waiting. A scan at a table nobody has seated raises a signal
 * staff confirm rather than occupying the table (`RD-TS-1`), and this is the
 * guest's half of that.
 */
export const JoinedPending: Story = {
  decorators: [
    scan({
      resolve: async () => resolved(),
      start: async () => ({
        ok: true,
        status: 'pending',
        session: {} as never,
        context,
      }),
    }),
  ],
  play: () => press('table-session-confirm-action'),
};

/** Seated. Staff have the table, and the guest can order. */
export const JoinedActive: Story = {
  decorators: [
    scan({
      resolve: async () => resolved(),
      start: async () => ({
        ok: true,
        status: 'active',
        session: {} as never,
        context,
      }),
    }),
  ],
  play: () => press('table-session-confirm-action'),
};

/** The guest ended their own session. */
export const Left: Story = {
  decorators: [
    scan({
      resolve: async () => resolved(),
      start: async () => ({
        ok: true,
        status: 'active',
        session: {} as never,
        context,
      }),
      leave: async () => 'left' as TableSessionStatus,
    }),
  ],
  play: async () => {
    await press('table-session-confirm-action');
    await press('table-session-leave');
  },
};

/**
 * The kitchen paused while the guest read the confirmation screen. The backend
 * re-runs the checks, so a confirmation offered a moment ago can come back as
 * "resolved, but not orderable" - and the menu is still theirs to read, so this
 * lands on the menu-only screen rather than on a refusal.
 */
export const PausedWhileConfirming: Story = {
  decorators: [
    scan({
      resolve: async () => resolved(),
      start: async () => ({
        ok: false,
        ordering: {
          available: false,
          reason: 'orderingPaused',
          pausedUntilTimestamp: Date.parse('2026-09-19T20:20:00Z'),
        },
      }),
    }),
  ],
  play: () => press('table-session-confirm-action'),
};

/**
 * One story per refusal reason, because each one is a different sentence and
 * one of three different next steps - which is the whole point of the reason
 * list being a closed set. A reason that lost its sentence would render as a
 * heading above a blank line, and that is what these photograph.
 */
const refusal = (
  reason: TableScanRefusalReason,
  reopensAt?: TableScanReopensAt,
): Story => ({
  decorators: [scan({ resolve: async () => refused(reason, reopensAt) })],
});

/** A code that was never ours, or a mistyped URL. */
export const RefusedUnknownToken = refusal('unknownToken');

/** The restaurant the token names is gone. */
export const RefusedRestaurantNotFound = refusal('restaurantNotFound');

/** Nobody holds the restaurant, so an order would land in an unopenable queue. */
export const RefusedRestaurantInactive = refusal('restaurantInactive');

/** The sticker in front of the guest names a table that is not published. */
export const RefusedTableNotFound = refusal('tableNotFound');

/** The table exists and the owner has taken it out of service. */
export const RefusedTableDisabled = refusal('tableDisabled');

/**
 * The one refusal whose next step is to look at the table again: there is a
 * working code, and it is the one the guest is not holding.
 */
export const RefusedTokenSuperseded = refusal('tokenSuperseded');

/** The code was withdrawn - a retired table, or one that leaked. */
export const RefusedTokenRevoked = refusal('tokenRevoked');

/**
 * Shut. The only refusal that says when to come back, and the only one whose
 * next step is to wait.
 */
export const RefusedRestaurantClosed = refusal('restaurantClosed', {
  day: 'wednesday',
  time: '11:30',
});

/** The restaurant has no menu document at all. */
export const RefusedMenuMissing = refusal('menuMissing');

/**
 * Nothing on the menu can be ordered today, at a restaurant that does take
 * orders from the table. Since issue #1597 a menu-only restaurant resolves
 * instead of reaching this.
 */
export const RefusedMenuUnavailable = refusal('menuUnavailable');

/**
 * The call never got an answer. Deliberately worded as our problem rather than
 * the restaurant's: a refusal is a working endpoint saying no, and this is not.
 */
export const FailedOffline: Story = {
  decorators: [scan({ resolve: async () => failed('offline') })],
};

/** The same code has been hammered, and the rate limiter said so. */
export const FailedRateLimited: Story = {
  decorators: [scan({ resolve: async () => failed('rateLimited') })],
};
