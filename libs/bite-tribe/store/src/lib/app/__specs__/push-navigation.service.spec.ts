import { TestBed } from '@angular/core/testing';
import { Navigation, NavigationEnd, Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { StartupNavigationService } from 'ta-firestore';
import {
  PushNavigationService,
  STARTUP_NAVIGATION_WAIT_MS,
} from '../push-navigation.service';

const FOLLOWER_PROFILE = { commands: ['profile', 'user-2'] };

/** Drains the promise chain the service walks before it navigates. */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
};

describe(PushNavigationService.name, () => {
  let events: Subject<NavigationEnd>;
  let navigationsInFlight: number;
  let resolveStartup: () => void;
  let hasSettled: boolean;
  let navController: { navigateForward: jest.Mock };
  let service: PushNavigationService;

  /** Reports the router as busy until `settleOneNavigation` has run it down. */
  const busyWith = (navigations: number): void => {
    navigationsInFlight = navigations;
  };

  const settleOneNavigation = (): void => {
    navigationsInFlight--;
    events.next(new NavigationEnd(1, '/', '/home'));
  };

  beforeEach(() => {
    events = new Subject<NavigationEnd>();
    navigationsInFlight = 0;
    hasSettled = true;
    navController = { navigateForward: jest.fn().mockResolvedValue(true) };

    const startupNavigation = {
      hasSettled: (): boolean => hasSettled,
      whenSettled: (): Promise<void> =>
        hasSettled
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              resolveStartup = resolve;
            }),
    };

    TestBed.configureTestingModule({
      providers: [
        PushNavigationService,
        { provide: NavController, useValue: navController },
        {
          provide: Router,
          useValue: {
            events: events.asObservable(),
            getCurrentNavigation: (): Navigation | null =>
              navigationsInFlight > 0 ? ({} as Navigation) : null,
          },
        },
        { provide: StartupNavigationService, useValue: startupNavigation },
      ],
    });

    service = TestBed.inject(PushNavigationService);
  });

  it('opens the target of a tap made while the app was already running', async () => {
    service.open(FOLLOWER_PROFILE);
    await flush();

    expect(navController.navigateForward).toHaveBeenCalledWith(
      ['profile', 'user-2'],
      undefined,
    );
  });

  it('carries navigation extras into the target', async () => {
    const weeklyBites = {
      commands: ['weekly-bites'],
      extras: { queryParams: { weekStart: '1', weekEnd: '2' } },
    };

    service.open(weeklyBites);
    await flush();

    expect(navController.navigateForward).toHaveBeenCalledWith(
      ['weekly-bites'],
      { queryParams: { weekStart: '1', weekEnd: '2' } },
    );
  });

  it('holds a tap that launched the app until startup navigation settles', async () => {
    // Navigating here would put the target ahead of the startup navigation in
    // the queue, and the later one wins — which is how the follower profile
    // became the Home feed (issue #1244).
    hasSettled = false;

    service.open(FOLLOWER_PROFILE);
    await flush();

    expect(navController.navigateForward).not.toHaveBeenCalled();

    resolveStartup();
    await flush();

    expect(navController.navigateForward).toHaveBeenCalledWith(
      ['profile', 'user-2'],
      undefined,
    );
  });

  it('waits for the startup redirect chain to come to rest', async () => {
    // `/` redirects to `start`, and `startGuard` forwards a signed-in user to
    // Home. Each hop reports itself settled while the next is already running.
    busyWith(2);

    service.open(FOLLOWER_PROFILE);
    await flush();

    expect(navController.navigateForward).not.toHaveBeenCalled();

    settleOneNavigation();
    await flush();

    expect(navController.navigateForward).not.toHaveBeenCalled();

    settleOneNavigation();
    await flush();

    expect(navController.navigateForward).toHaveBeenCalledTimes(1);
  });

  it('navigates exactly once per tap', async () => {
    busyWith(1);

    service.open(FOLLOWER_PROFILE);
    await flush();

    settleOneNavigation();
    await flush();

    expect(navController.navigateForward).toHaveBeenCalledTimes(1);
  });

  it('opens only the later of two notifications tapped during one startup', async () => {
    // Stacking both would open a surface the user never asked to see on the
    // way to the one they did.
    hasSettled = false;

    service.open(FOLLOWER_PROFILE);
    service.open({ commands: ['bite', 'bite-1'] });
    await flush();

    resolveStartup();
    await flush();

    expect(navController.navigateForward).toHaveBeenCalledTimes(1);
    expect(navController.navigateForward).toHaveBeenCalledWith(
      ['bite', 'bite-1'],
      undefined,
    );
  });

  it('answers a tap that arrives while the previous one is still opening', async () => {
    // The first navigation is still resolving, so this tap finds the service
    // busy; dropping it would lose a notification the user did tap.
    let finishFirstNavigation!: () => void;
    navController.navigateForward.mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        finishFirstNavigation = (): void => resolve(true);
      }),
    );

    service.open(FOLLOWER_PROFILE);
    await flush();

    service.open({ commands: ['bite', 'bite-1'] });
    finishFirstNavigation();
    await flush();

    expect(navController.navigateForward).toHaveBeenNthCalledWith(
      2,
      ['bite', 'bite-1'],
      undefined,
    );
  });

  it('opens the target anyway when startup navigation never settles', async () => {
    // A blocked or stalled startup must not swallow the tap without trace.
    jest.useFakeTimers();
    hasSettled = false;

    try {
      service.open(FOLLOWER_PROFILE);
      await flush();

      expect(navController.navigateForward).not.toHaveBeenCalled();

      jest.advanceTimersByTime(STARTUP_NAVIGATION_WAIT_MS);
      await flush();

      expect(navController.navigateForward).toHaveBeenCalledWith(
        ['profile', 'user-2'],
        undefined,
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
