import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { freshSessionGuard } from '../fresh-session.guard';
import { AuthService } from '../auth.service';
import { Network } from '@capacitor/network';

jest.mock('@capacitor/network', () => ({
  Network: { getStatus: jest.fn() },
}));

const getStatus = Network.getStatus as jest.Mock;

describe('freshSessionGuard', () => {
  let refreshSession: jest.Mock;
  let parseUrl: jest.Mock;

  const runGuard = (): Promise<boolean | UrlTree> =>
    TestBed.runInInjectionContext(() =>
      (freshSessionGuard as () => Promise<boolean | UrlTree>)(),
    );

  beforeEach(() => {
    refreshSession = jest.fn();
    parseUrl = jest.fn(
      (url: string): UrlTree => ({ url }) as unknown as UrlTree,
    );

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { refreshSession } },
        { provide: Router, useValue: { parseUrl } },
      ],
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('allows navigation when the session refresh succeeds', async () => {
    getStatus.mockResolvedValue({ connected: true });
    refreshSession.mockResolvedValue(true);

    await expect(runGuard()).resolves.toBe(true);
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('redirects to /start when the session refresh fails', async () => {
    getStatus.mockResolvedValue({ connected: true });
    refreshSession.mockResolvedValue(false);

    const result = await runGuard();

    expect(parseUrl).toHaveBeenCalledWith('/start');
    expect(result).toEqual({ url: '/start' });
  });

  it('allows navigation offline without attempting a refresh', async () => {
    getStatus.mockResolvedValue({ connected: false });

    await expect(runGuard()).resolves.toBe(true);
    expect(refreshSession).not.toHaveBeenCalled();
  });
});
