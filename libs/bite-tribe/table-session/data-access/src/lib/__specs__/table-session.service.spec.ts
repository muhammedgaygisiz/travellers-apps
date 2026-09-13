import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TableSessionApiService } from 'bite-tribe/api';
import type { TableScanContext } from 'model';
import { TableSessionService } from '../table-session.service';

/**
 * The five states a scanned code can land in (GitHub issue #1101).
 *
 * A scan is not a request that succeeds or fails, and the tests below are what
 * holds that open: a refusal is an answer, a transport failure is a different
 * answer, and both are distinguishable from the confirmation the guest is
 * supposed to read before anything is ordered.
 */

const CONTEXT: TableScanContext = {
  token: 'ABCDEFGHJKMNPQRSTVWXYZ0123',
  restaurant: { id: 'restaurant-1', name: 'Sakura Kitchen' },
  room: { id: 'room-1', name: 'Main dining room' },
  table: { id: 'table-12', label: '12', seats: 4 },
  menu: { id: 'menu-1' },
  ordering: { available: true },
};

/** The same table at a restaurant that takes no orders here (issue #1102). */
const MENU_ONLY: TableScanContext = {
  ...CONTEXT,
  ordering: { available: false, reason: 'tableOrderingDisabled' },
};

describe(TableSessionService.name, () => {
  let service: TableSessionService;
  let resolveToken: jest.Mock;
  let start: jest.Mock;
  let leave: jest.Mock;

  const build = (token: string | null = CONTEXT.token): TableSessionService => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TableSessionService,
        {
          provide: TableSessionApiService,
          useValue: { resolveToken, start, leave },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: (): string | null => token } },
          },
        },
      ],
    });

    return TestBed.inject(TableSessionService);
  };

  beforeEach(() => {
    resolveToken = jest.fn().mockResolvedValue({ ok: true, ...CONTEXT });
    start = jest.fn().mockResolvedValue({
      ok: true,
      status: 'active',
      session: {},
      context: CONTEXT,
    });
    leave = jest.fn().mockResolvedValue('left');
  });

  describe('resolving the code', () => {
    it('starts by asking the guest to confirm the restaurant and table', async () => {
      service = build();

      await service.resolve();

      expect(service.state()).toEqual({ kind: 'confirm', context: CONTEXT });
    });

    /**
     * A refusal is an ordinary outcome of a working endpoint - the code on the
     * table of a restaurant that closed an hour ago is not an error - so it
     * arrives as a state with its reason and its next step, not as a failure.
     */
    it('keeps the reason and the next step of a refusal', async () => {
      resolveToken.mockResolvedValue({
        ok: false,
        reason: 'restaurantClosed',
        nextStep: 'tryLater',
        reopensAt: { day: 'wednesday', time: '11:30' },
      });
      service = build();

      await service.resolve();

      expect(service.state()).toEqual({
        kind: 'refused',
        reason: 'restaurantClosed',
        nextStep: 'tryLater',
        reopensAt: { day: 'wednesday', time: '11:30' },
      });
    });

    /**
     * Kept apart from a refusal, because the sentence is different: a refusal
     * tells the guest something true about the restaurant, and this tells them
     * the phone never got through.
     */
    it('reports a transport failure as its own state', async () => {
      resolveToken.mockResolvedValue({ ok: false, failure: 'offline' });
      service = build();

      await service.resolve();

      expect(service.state()).toEqual({ kind: 'failed', failure: 'offline' });
    });

    it('refuses a route with no token without calling the backend', async () => {
      service = build(null);

      await service.resolve();

      expect(resolveToken).not.toHaveBeenCalled();
      expect(service.state()).toMatchObject({ reason: 'unknownToken' });
    });
  });

  /**
   * A scan can resolve and still not be orderable since issue #1102. The screen
   * lands on a state of its own rather than on the confirmation, because there
   * is nothing to confirm: no session is started and no table is claimed, and
   * the one thing the guest can do is read the menu.
   */
  describe('a restaurant that takes no orders here', () => {
    it('offers the menu rather than a confirmation', async () => {
      resolveToken.mockResolvedValue({ ok: true, ...MENU_ONLY });
      service = build();

      await service.resolve();

      expect(service.state()).toEqual({
        kind: 'menuOnly',
        context: MENU_ONLY,
        ordering: { available: false, reason: 'tableOrderingDisabled' },
      });
    });

    it('does not start a session', async () => {
      resolveToken.mockResolvedValue({ ok: true, ...MENU_ONLY });
      service = build();

      await service.resolve();
      await service.confirm();

      expect(start).not.toHaveBeenCalled();
    });

    /**
     * The sharp case: ordering was open when the guest read the screen and the
     * kitchen paused before they tapped. The backend refuses the session, and
     * what comes back is a menu to read rather than a refusal to apologise for.
     */
    it('falls back to the menu when ordering closed while the guest read', async () => {
      start.mockResolvedValue({
        ok: false,
        ordering: {
          available: false,
          reason: 'orderingPaused',
          pausedUntilTimestamp: 1789030800000,
        },
      });
      service = build();
      await service.resolve();

      await service.confirm();

      expect(service.state()).toMatchObject({
        kind: 'menuOnly',
        ordering: { reason: 'orderingPaused' },
      });
    });
  });

  describe('confirming', () => {
    /**
     * The acceptance criterion the confirmation screen exists for: nothing is
     * started until the guest has agreed to the restaurant and table they were
     * shown.
     */
    it('does not start a session on resolution alone', async () => {
      service = build();

      await service.resolve();

      expect(start).not.toHaveBeenCalled();
    });

    it('joins the party when the table is already seated', async () => {
      service = build();
      await service.resolve();

      await service.confirm();

      expect(service.state()).toEqual({
        kind: 'joined',
        status: 'active',
        context: CONTEXT,
      });
    });

    it('waits on staff when the table has not been seated', async () => {
      start.mockResolvedValue({
        ok: true,
        status: 'pending',
        session: {},
        context: CONTEXT,
      });
      service = build();
      await service.resolve();

      await service.confirm();

      expect(service.state()).toMatchObject({ status: 'pending' });
    });

    /**
     * The backend re-runs the twelve checks, so a confirmation can be refused
     * even though the resolution a moment earlier was not - the kitchen can
     * pause while somebody reads a screen. The refusal replaces the
     * confirmation rather than sitting beside it, so the guest is never looking
     * at a table name and a "we are closed" at once.
     */
    it('replaces the confirmation when the scan no longer resolves', async () => {
      start.mockResolvedValue({
        ok: false,
        reason: 'restaurantClosed',
        nextStep: 'tryLater',
        reopensAt: { day: 'thursday', time: '11:30' },
      });
      service = build();
      await service.resolve();

      await service.confirm();

      expect(service.state()).toEqual({
        kind: 'refused',
        reason: 'restaurantClosed',
        nextStep: 'tryLater',
        reopensAt: { day: 'thursday', time: '11:30' },
      });
    });

    /** A double tap must not start two sessions, or spend two calls saying so. */
    it('ignores a second tap while the first is in flight', async () => {
      let release: (value: unknown) => void = () => undefined;
      start.mockReturnValue(new Promise((resolve) => (release = resolve)));
      service = build();
      await service.resolve();

      const first = service.confirm();
      await service.confirm();

      expect(start).toHaveBeenCalledTimes(1);

      release({ ok: true, status: 'active', session: {}, context: CONTEXT });
      await first;
    });
  });

  describe('leaving', () => {
    it('names the restaurant and table the guest is in', async () => {
      service = build();
      await service.resolve();
      await service.confirm();

      await service.leave();

      expect(leave).toHaveBeenCalledWith('restaurant-1', 'table-12');
      expect(service.state()).toEqual({ kind: 'left', context: CONTEXT });
    });

    /**
     * A guest who tapped leave on a session the restaurant had already closed
     * asked to be out of it and is out of it. Explaining the difference would
     * be explaining a race they cannot act on.
     */
    it('lands on left whichever ending came back', async () => {
      leave.mockResolvedValue('closed');
      service = build();
      await service.resolve();
      await service.confirm();

      await service.leave();

      expect(service.state()).toMatchObject({ kind: 'left' });
    });

    it('does nothing when the guest is not in a session', async () => {
      service = build();
      await service.resolve();

      await service.leave();

      expect(leave).not.toHaveBeenCalled();
      expect(service.state()).toMatchObject({ kind: 'confirm' });
    });
  });

  describe('the context on screen', () => {
    /**
     * A computed rather than a second signal, so the restaurant name cannot
     * survive into a state that no longer has a restaurant behind it - which is
     * how a refusal screen ends up headed "Sakura Kitchen, table 12".
     */
    it('is dropped when the state no longer has one', async () => {
      service = build();
      await service.resolve();
      expect(service.context()).toEqual(CONTEXT);

      resolveToken.mockResolvedValue({
        ok: false,
        reason: 'tableDisabled',
        nextStep: 'askStaff',
      });
      await service.retry();

      expect(service.context()).toBeUndefined();
    });
  });
});
