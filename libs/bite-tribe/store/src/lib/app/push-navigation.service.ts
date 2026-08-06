import { inject, Injectable } from '@angular/core';
import {
  Event as RouterEvent,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  Router,
} from '@angular/router';
import { NavController } from '@ionic/angular';
import { filter, firstValueFrom, map } from 'rxjs';
import { NotificationTarget } from 'push-notifications';
import { StartupNavigationService } from 'ta-firestore';

/** How long a held target waits for startup navigation before giving up. */
export const STARTUP_NAVIGATION_WAIT_MS = 10_000;

/** How long it then waits for the startup redirect chain to come to rest. */
export const ROUTER_IDLE_WAIT_MS = 5_000;

/** Redirect hops tolerated while waiting for the router to come to rest. */
const MAX_SETTLE_ROUNDS = 10;

const isNavigationSettled = (event: RouterEvent): boolean =>
  event instanceof NavigationEnd ||
  event instanceof NavigationCancel ||
  event instanceof NavigationError ||
  event instanceof NavigationSkipped;

const afterMs = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Opens the surface a tapped push notification talks about, once the app is far
 * enough along to keep it.
 *
 * A tap that launched or resumed the app arrives mid-startup. Initial
 * navigation is disabled until the App Check gate releases it, and that startup
 * navigation resolves the browser's current URL — `/` for a signed-in user,
 * which redirects to Home. Navigating straight from the push listener puts the
 * target ahead of the startup chain in the queue, so the last navigation issued
 * wins and the user lands on Home instead of on the follower profile the
 * notification was about (issue #1244).
 *
 * So the target is held, not navigated: first until startup navigation is
 * released, then until the redirect chain it kicks off comes to rest. Only then
 * is a single navigation issued, which nothing further overwrites. Both waits
 * are bounded — a startup that never settles must not swallow the tap silently.
 *
 * Route guards still apply: the target is navigated through the router, so an
 * incomplete onboarding or a lost session redirects the same way it would for a
 * tap made while the app was already open.
 */
@Injectable({ providedIn: 'root' })
export class PushNavigationService {
  private readonly router = inject(Router);
  private readonly navController = inject(NavController);
  private readonly startupNavigation = inject(StartupNavigationService);

  private pendingTarget: NotificationTarget | undefined;
  private isOpening = false;

  /**
   * Requests the target of a tapped notification.
   *
   * A second tap arriving while the first is still held replaces it rather than
   * queueing behind it: two notifications tapped during one startup mean the
   * user asked for the later surface, and stacking both would open a page they
   * did not ask to see on the way. Exactly one navigation is issued per tap
   * that is not superseded this way.
   */
  open(target: NotificationTarget): void {
    this.pendingTarget = target;

    if (this.isOpening) {
      return;
    }

    void this.openPendingTarget();
  }

  private async openPendingTarget(): Promise<void> {
    this.isOpening = true;

    try {
      // A tap that lands while the previous navigation is still resolving sets
      // a new target and finds this already running, so the loop re-reads
      // rather than returning and leaving that tap unanswered.
      while (this.pendingTarget) {
        await Promise.race([
          this.startupNavigation.whenSettled(),
          afterMs(STARTUP_NAVIGATION_WAIT_MS),
        ]);

        await Promise.race([
          this.whenRouterIdle(),
          afterMs(ROUTER_IDLE_WAIT_MS),
        ]);

        const target = this.pendingTarget;
        this.pendingTarget = undefined;

        if (!target) {
          return;
        }

        await this.navController.navigateForward(
          target.commands,
          target.extras,
        );
      }
    } finally {
      this.isOpening = false;
    }
  }

  /**
   * Resolves when no navigation is in flight.
   *
   * Startup rarely settles in one hop: the initial navigation supersedes the
   * post-login one, `/` redirects to `start`, and `startGuard` forwards a
   * signed-in user to Home. Each hop reports itself as settled while the next
   * is already running, so idleness is re-checked after every one instead of
   * trusting the first.
   */
  private async whenRouterIdle(): Promise<void> {
    for (let round = 0; round < MAX_SETTLE_ROUNDS; round++) {
      if (!this.router.getCurrentNavigation()) {
        return;
      }

      await firstValueFrom(
        this.router.events.pipe(
          filter(isNavigationSettled),
          map(() => undefined),
        ),
      );
    }
  }
}
