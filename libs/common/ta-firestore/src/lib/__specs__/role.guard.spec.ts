import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Store } from '@ngrx/store';
import { roleGuard } from '../role.guard';
import { AuthService } from '../auth.service';
import { RequestedUrlService } from '../requested-url.service';
import { AuthActions } from '../ngrx-store/actions';
import { BiteTribeRole } from 'utils';

describe('roleGuard', () => {
  let getUser: jest.Mock;
  let whenAuthStateRestored: jest.Mock;
  let hasRole: jest.Mock;
  let endRejectedSession: jest.Mock;
  let parseUrl: jest.Mock;
  let dispatch: jest.Mock;
  let requestedUrlService: RequestedUrlService;

  const runGuard = (
    role: BiteTribeRole = 'business',
    url = '/dashboard',
  ): Promise<boolean | UrlTree> =>
    TestBed.runInInjectionContext(
      () =>
        roleGuard(role)(
          {} as ActivatedRouteSnapshot,
          { url } as RouterStateSnapshot,
        ) as Promise<boolean | UrlTree>,
    );

  /** Makes the role check answer `false` `times` times, then always `true`. */
  const grantedAfter = (times: number): void => {
    let remaining = times;

    hasRole.mockImplementation(async () => {
      if (remaining > 0) {
        remaining -= 1;
        return false;
      }

      return true;
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    getUser = jest.fn(() => ({ uid: 'user-1' }));
    hasRole = jest.fn(async () => true);
    endRejectedSession = jest.fn(async () => undefined);
    dispatch = jest.fn();
    parseUrl = jest.fn(
      (url: string): UrlTree => ({ url }) as unknown as UrlTree,
    );
    whenAuthStateRestored = jest.fn(() => Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            getUser,
            whenAuthStateRestored,
            hasRole,
            endRejectedSession,
          },
        },
        { provide: Router, useValue: { parseUrl } },
        { provide: Store, useValue: { dispatch } },
      ],
    });

    requestedUrlService = TestBed.inject(RequestedUrlService);
  });

  it('allows an account holding the required role', async () => {
    await expect(runGuard('business')).resolves.toBe(true);
    expect(hasRole).toHaveBeenCalledWith('business');
    expect(endRejectedSession).not.toHaveBeenCalled();
  });

  it('asks for the role the route requires, not a fixed one', async () => {
    await runGuard('admin');

    expect(hasRole).toHaveBeenCalledWith('admin');
  });

  // Angular activates a route's guards concurrently, so this guard cannot lean
  // on `authGuard` having waited for the session on the same route.
  it('waits for the session to be restored before judging the account', async () => {
    let restore: () => void = () => undefined;
    whenAuthStateRestored.mockReturnValue(
      new Promise<void>((resolve) => {
        restore = resolve;
      }),
    );
    getUser.mockReturnValue(undefined);

    const result = runGuard();

    getUser.mockReturnValue({ uid: 'user-1' });
    restore();

    await expect(result).resolves.toBe(true);
  });

  it('sends a signed-out visitor to start and remembers where they were going', async () => {
    getUser.mockReturnValue(undefined);

    await expect(runGuard('business', '/restaurant/42')).resolves.toEqual({
      url: '/start',
    });
    expect(requestedUrlService.consume()).toBe('/restaurant/42');
    expect(hasRole).not.toHaveBeenCalled();
  });

  describe('an account without the required role', () => {
    beforeEach(() => {
      hasRole.mockResolvedValue(false);
    });

    // Telling it which role it lacks would confirm the account exists, that its
    // credentials were right, and which role guards the app.
    it('goes to the login page rather than an explanatory one', async () => {
      await expect(runGuard('business')).resolves.toEqual({ url: '/login' });
    });

    it('is signed out, so no token is left to retry a deep link with', async () => {
      await runGuard('business');

      expect(endRejectedSession).toHaveBeenCalled();
    });

    it('is reported with the same generic failure a wrong password produces', async () => {
      await runGuard('business');

      expect(dispatch).toHaveBeenCalledWith(AuthActions.loginFailed());
    });

    it('ends the session before the redirect, not after', async () => {
      const order: string[] = [];
      endRejectedSession.mockImplementation(async () => {
        order.push('signOut');
      });
      parseUrl.mockImplementation((url: string) => {
        order.push('redirect');
        return { url } as unknown as UrlTree;
      });

      await runGuard('business');

      expect(order).toEqual(['signOut', 'redirect']);
    });

    it('does not remember the URL it was rejected from', async () => {
      await runGuard('business', '/restaurant/42');

      expect(requestedUrlService.consume()).toBeUndefined();
    });

    it('gives up after the forced refresh rather than retrying forever', async () => {
      await runGuard('business');

      expect(hasRole).toHaveBeenCalledTimes(2);
    });
  });

  // A cached ID token can be an hour old, so a role granted moments ago is not
  // in it yet.
  it('retries once against a freshly minted token before rejecting', async () => {
    grantedAfter(1);

    await expect(runGuard('business')).resolves.toBe(true);
    expect(hasRole).toHaveBeenNthCalledWith(1, 'business');
    expect(hasRole).toHaveBeenNthCalledWith(2, 'business', true);
    expect(endRejectedSession).not.toHaveBeenCalled();
  });

  it('does not force a token refresh when the cached token already carries the role', async () => {
    await runGuard('business');

    expect(hasRole).toHaveBeenCalledTimes(1);
  });
});
