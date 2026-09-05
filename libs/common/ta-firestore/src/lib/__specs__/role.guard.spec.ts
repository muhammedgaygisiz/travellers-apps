import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { roleGuard } from '../role.guard';
import { AuthService } from '../auth.service';
import { RequestedUrlService } from '../requested-url.service';
import { BiteTribeRole } from 'utils';

describe('roleGuard', () => {
  let getUser: jest.Mock;
  let whenAuthStateRestored: jest.Mock;
  let hasRole: jest.Mock;
  let parseUrl: jest.Mock;
  let requestedUrlService: RequestedUrlService;
  let resolveRestored: () => void;

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
    parseUrl = jest.fn(
      (url: string): UrlTree => ({ url }) as unknown as UrlTree,
    );

    const restored = new Promise<void>((resolve) => {
      resolveRestored = resolve;
    });
    whenAuthStateRestored = jest.fn(() => restored);
    resolveRestored();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { getUser, whenAuthStateRestored, hasRole },
        },
        { provide: Router, useValue: { parseUrl } },
      ],
    });

    requestedUrlService = TestBed.inject(RequestedUrlService);
  });

  it('allows an account holding the required role', async () => {
    await expect(runGuard('business')).resolves.toBe(true);
    expect(hasRole).toHaveBeenCalledWith('business');
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

  it('sends a signed-in account without the role to no-access, naming the role', async () => {
    hasRole.mockResolvedValue(false);

    await expect(runGuard('business')).resolves.toEqual({
      url: '/no-access?role=business',
    });
  });

  // Bouncing back to `start` would hand the account to `startGuard`, which
  // forwards a signed-in visitor straight back in.
  it('does not send an account that lacks the role back to start', async () => {
    hasRole.mockResolvedValue(false);

    await runGuard('admin');

    expect(parseUrl).not.toHaveBeenCalledWith('/start');
  });

  it('does not remember the URL of an account that is merely missing the role', async () => {
    hasRole.mockResolvedValue(false);

    await runGuard('business', '/restaurant/42');

    expect(requestedUrlService.consume()).toBeUndefined();
  });

  // A cached ID token can be an hour old, so a role granted moments ago is not
  // in it yet.
  it('retries once against a freshly minted token before rejecting', async () => {
    grantedAfter(1);

    await expect(runGuard('business')).resolves.toBe(true);
    expect(hasRole).toHaveBeenNthCalledWith(1, 'business');
    expect(hasRole).toHaveBeenNthCalledWith(2, 'business', true);
  });

  it('does not force a token refresh when the cached token already carries the role', async () => {
    await runGuard('business');

    expect(hasRole).toHaveBeenCalledTimes(1);
  });

  it('gives up after the forced refresh rather than retrying forever', async () => {
    hasRole.mockResolvedValue(false);

    await runGuard('business');

    expect(hasRole).toHaveBeenCalledTimes(2);
  });
});
