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
import {
  TableSessionService,
  type TableSessionView,
} from 'bite-tribe/table-session-data-access';
import type { TableScanContext } from 'model';
import { TableSession } from '../table-session';

jest.mock('@capacitor-firebase/analytics');

addNecessaryIcons();

/**
 * What a guest actually reads (GitHub issue #1101).
 *
 * The data-access specs cover which state a scan lands in; these cover that
 * each state puts the right sentence in front of somebody sitting at a table -
 * the half that fails silently. A refusal reason with no translation renders as
 * an empty paragraph, and an empty paragraph is a guest being told nothing at
 * all, which is the outcome the whole closed reason list exists to prevent.
 *
 * The service is a fake driven by a signal rather than the real one behind a
 * mocked callable. The screen's contract is "given this state, show this", and
 * routing that through the state machine would make every one of these tests
 * fail twice for one bug.
 */

const CONTEXT: TableScanContext = {
  token: 'ABCDEFGHJKMNPQRSTVWXYZ0123',
  restaurant: { id: 'restaurant-1', name: 'Sakura Kitchen' },
  room: { id: 'room-1', name: 'Main dining room' },
  table: { id: 'table-12', label: '12', seats: 4 },
  menu: { id: 'menu-1' },
};

const en = {
  'table-session-checking': 'Checking this table...',
  'table-session-confirm-heading':
    'You are ordering at {{restaurant}}, table {{table}}',
  'table-session-confirm-room': '{{room}}',
  'table-session-confirm-intro':
    'Check that this is the table you are sitting at.',
  'table-session-confirm-action': 'Yes, this is my table',
  'table-session-active-heading': "You're at table {{table}}",
  'table-session-active-intro':
    '{{restaurant}} has your table open, so you can order from here.',
  'table-session-pending-heading':
    "We've told {{restaurant}} you're at table {{table}}",
  'table-session-pending-intro':
    'Ordering opens once staff confirm your table.',
  'table-session-menu-soon': 'The menu and ordering are on their way.',
  'table-session-leave': 'Leave this table',
  'table-session-left-heading': 'You have left this table',
  'table-session-left-intro':
    'Anyone else at table {{table}} is still ordering.',
  'table-session-rejoin': 'Join again',
  'table-session-refused-title': "This table isn't taking orders",
  'table-session-refused-tokenSuperseded':
    'This code has been replaced. There should be a newer one on the table.',
  'table-session-refused-restaurantClosed':
    'The restaurant is closed right now.',
  'table-session-reopens-at': 'Open again on {{day}} at {{time}}.',
  'table-session-next-rescanCode': 'Scan the code on the table again.',
  'table-session-next-tryLater': 'Try again in a little while.',
  'table-session-failed-title': "We couldn't reach the restaurant",
  'table-session-failed-offline': 'Check your connection and try again.',
  'table-session-try-again': 'Try again',
  'day-wednesday': 'Wednesday',
};

describe(TableSession.name, () => {
  let fixture: ComponentFixture<TableSession>;
  let state: WritableSignal<TableSessionView>;
  let resolve: jest.Mock;
  let confirm: jest.Mock;
  let leave: jest.Mock;
  let retry: jest.Mock;

  const show = (next: TableSessionView): void => {
    state.set(next);
    fixture.detectChanges();
  };

  const render = (): void => {
    fixture = TestBed.createComponent(TableSession);
    fixture.detectChanges();
  };

  const textOf = (testId: string): string =>
    fixture.nativeElement
      .querySelector(`[data-testid="${testId}"]`)
      ?.textContent?.trim() ?? '';

  const has = (testId: string): boolean =>
    !!fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const click = (testId: string): void => {
    fixture.nativeElement
      .querySelector(`[data-testid="${testId}"]`)
      ?.dispatchEvent(new Event('click'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    state = signal<TableSessionView>({ kind: 'loading' });
    resolve = jest.fn().mockResolvedValue(undefined);
    confirm = jest.fn().mockResolvedValue(undefined);
    leave = jest.fn().mockResolvedValue(undefined);
    retry = jest.fn().mockResolvedValue(undefined);

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
        {
          provide: TableSessionService,
          useValue: {
            state,
            isBusy: signal(false),
            context: signal(CONTEXT),
            resolve,
            confirm,
            leave,
            retry,
          },
        },
      ],
    })
      // The component provides the real service, which would win over the one
      // above. Overriding at the component is the only place that reaches it.
      .overrideComponent(TableSession, { set: { providers: [] } })
      .compileComponents();
  });

  it('starts resolving the scanned code as soon as it opens', () => {
    render();

    expect(resolve).toHaveBeenCalled();
    expect(has('table-session-loading')).toBe(true);
  });

  /**
   * The acceptance criterion, as a sentence on a screen: the restaurant and the
   * table are named before anything is ordered.
   */
  it('names the restaurant and the table before anything else', () => {
    render();

    show({ kind: 'confirm', context: CONTEXT });

    expect(textOf('table-session-confirm')).toContain(
      'You are ordering at Sakura Kitchen, table 12',
    );
    expect(confirm).not.toHaveBeenCalled();
  });

  it('starts the session only once the guest confirms', () => {
    render();
    show({ kind: 'confirm', context: CONTEXT });

    click('table-session-confirm-action');

    expect(confirm).toHaveBeenCalled();
  });

  /**
   * Both lines, not just the heading. Every interpolated key needs the
   * parameters passed at its own call site, and a sentence that names the
   * restaurant while the template hands it nothing renders as " has your table
   * open" - which reads as a missing word rather than as a bug, so nobody
   * reports it. The fixture therefore carries the real copy, interpolation
   * included.
   */
  it('says ordering is open and names the restaurant', () => {
    render();

    show({ kind: 'joined', status: 'active', context: CONTEXT });

    expect(textOf('table-session-joined')).toContain("You're at table 12");
    expect(textOf('table-session-joined')).toContain(
      'Sakura Kitchen has your table open',
    );
  });

  it('says the restaurant has been told when staff have not confirmed yet', () => {
    render();

    show({ kind: 'joined', status: 'pending', context: CONTEXT });

    expect(textOf('table-session-joined')).toContain(
      "We've told Sakura Kitchen you're at table 12",
    );
  });

  it('lets the guest leave and says the others are still ordering', () => {
    render();
    show({ kind: 'joined', status: 'active', context: CONTEXT });

    click('table-session-leave');
    show({ kind: 'left', context: CONTEXT });

    expect(leave).toHaveBeenCalled();
    expect(textOf('table-session-left')).toContain(
      'Anyone else at table 12 is still ordering',
    );
  });

  /**
   * The whole reason the refusal reasons are a closed set. A guest told
   * "something went wrong" at a table puts their phone away; a guest told the
   * sticker was replaced looks at the sticker.
   */
  it('gives a refusal its own sentence and its own next step', () => {
    render();

    show({
      kind: 'refused',
      reason: 'tokenSuperseded',
      nextStep: 'rescanCode',
    });

    expect(textOf('table-session-reason')).toBe(
      'This code has been replaced. There should be a newer one on the table.',
    );
    expect(textOf('table-session-next-step')).toBe(
      'Scan the code on the table again.',
    );
  });

  it('names a translated day when the restaurant reopens', () => {
    render();

    show({
      kind: 'refused',
      reason: 'restaurantClosed',
      nextStep: 'tryLater',
      reopensAt: { day: 'wednesday', time: '11:30' },
    });

    expect(textOf('table-session-reopens-at')).toBe(
      'Open again on Wednesday at 11:30.',
    );
  });

  /**
   * A transport failure is worded differently from a refusal, because it says
   * something about the phone rather than about the restaurant - and it is the
   * only one of the two worth apologising for.
   */
  it('keeps a transport failure apart from a refusal', () => {
    render();

    show({ kind: 'failed', failure: 'offline' });

    expect(has('table-session-refused')).toBe(false);
    expect(textOf('table-session-failure')).toBe(
      'Check your connection and try again.',
    );
  });

  /**
   * The "try again" button, which is the only thing a guest can do about a
   * refusal or a dropped connection. It re-resolves the same code rather than
   * reloading, because the token is still in the URL and the thing that changed
   * is at the restaurant's end.
   */
  it('re-resolves the code from a refusal', () => {
    render();
    show({ kind: 'refused', reason: 'restaurantClosed', nextStep: 'tryLater' });

    click('table-session-retry');

    expect(retry).toHaveBeenCalled();
  });

  it('re-resolves the code from a transport failure', () => {
    render();
    show({ kind: 'failed', failure: 'offline' });

    click('table-session-retry');

    expect(retry).toHaveBeenCalled();
  });

  /**
   * A refusal carries no restaurant, and the sentences that would name one are
   * not rendered on it - so nothing interpolates an absent value. The assertion
   * is that no "undefined" reaches the screen, which is what a bare template
   * expression over a missing context would print on the one screen that is
   * already bad news.
   */
  it('never prints undefined on a screen with no restaurant behind it', () => {
    render();

    show({ kind: 'refused', reason: 'restaurantClosed', nextStep: 'tryLater' });

    expect(fixture.nativeElement.textContent).not.toContain('undefined');
    expect(textOf('table-session-refused')).toContain(
      'The restaurant is closed right now.',
    );
  });

  /**
   * The room name is the one part of the confirmation a restaurant may not
   * have - a table whose room was deleted still resolves, because the guest is
   * still sitting at it. The line is dropped rather than rendered empty.
   */
  it('drops the room line when the table names no room', () => {
    render();

    show({
      kind: 'confirm',
      context: { ...CONTEXT, room: { id: 'room-1' } },
    });

    expect(textOf('table-session-confirm')).toContain(
      'You are ordering at Sakura Kitchen, table 12',
    );
    expect(textOf('table-session-confirm')).not.toContain('Main dining room');
  });

  it('reports the screen to analytics', () => {
    render();

    fixture.componentInstance.ionViewDidEnter();

    expect(FirebaseAnalytics.setCurrentScreen).toHaveBeenCalledWith({
      screenName: 'Table Session',
    });
  });
});
