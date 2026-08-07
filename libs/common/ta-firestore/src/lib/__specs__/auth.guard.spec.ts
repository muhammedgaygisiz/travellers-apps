import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { authGuard } from '../auth.guard';
import { AuthService } from '../auth.service';
import { RequestedUrlService } from '../requested-url.service';
import { isAccountDeletionPage, isPrivacyPage } from 'utils';

jest.mock('utils', () => ({
  ...jest.requireActual('utils'),
  isPrivacyPage: jest.fn(() => false),
  isAccountDeletionPage: jest.fn(() => false),
}));

describe('authGuard', () => {
  let getUser: jest.Mock;
  let whenAuthStateRestored: jest.Mock;
  let parseUrl: jest.Mock;
  let requestedUrlService: RequestedUrlService;
  let resolveRestored: () => void;

  const runGuard = (url = '/bite/shared-123'): Promise<boolean | UrlTree> =>
    TestBed.runInInjectionContext(
      () =>
        authGuard(
          {} as ActivatedRouteSnapshot,
          { url } as RouterStateSnapshot,
        ) as Promise<boolean | UrlTree>,
    );

  beforeEach(() => {
    jest.clearAllMocks();

    (isPrivacyPage as jest.Mock).mockReturnValue(false);
    (isAccountDeletionPage as jest.Mock).mockReturnValue(false);

    getUser = jest.fn(() => undefined);
    parseUrl = jest.fn(
      (url: string): UrlTree => ({ url }) as unknown as UrlTree,
    );

    const restored = new Promise<void>((resolve) => {
      resolveRestored = resolve;
    });
    whenAuthStateRestored = jest.fn(() => restored);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { getUser, whenAuthStateRestored },
        },
        { provide: Router, useValue: { parseUrl } },
      ],
    });

    requestedUrlService = TestBed.inject(RequestedUrlService);
  });

  it('allows navigation for a session that is already restored', async () => {
    getUser.mockReturnValue({ uid: 'user-1' });

    await expect(runGuard()).resolves.toBe(true);
    expect(whenAuthStateRestored).not.toHaveBeenCalled();
  });

  it('waits for a session still being restored and then allows the deep link', async () => {
    // The cold web load starts with no user: `auth.currentUser` is still null
    // while the persisted session is read out of IndexedDB.
    const result = runGuard();

    getUser.mockReturnValue({ uid: 'user-1' });
    resolveRestored();

    await expect(result).resolves.toBe(true);
    expect(parseUrl).not.toHaveBeenCalled();
  });

  it('remembers the requested URL when the visitor turns out to be signed out', async () => {
    const result = runGuard('/bite/shared-123');

    resolveRestored();

    expect(await result).toEqual({ url: '/start' });
    expect(requestedUrlService.consume()).toBe('/bite/shared-123');
  });

  it('remembers the query string of the requested URL', async () => {
    const result = runGuard('/bite/shared-123?from=share');

    resolveRestored();

    await result;

    expect(requestedUrlService.consume()).toBe('/bite/shared-123?from=share');
  });

  it('lets the public privacy page through', async () => {
    (isPrivacyPage as jest.Mock).mockReturnValue(true);

    await expect(runGuard('/privacy')).resolves.toBe(true);
  });

  it('lets the public account deletion page through', async () => {
    (isAccountDeletionPage as jest.Mock).mockReturnValue(true);

    await expect(runGuard('/account-deletion')).resolves.toBe(true);
  });
});
