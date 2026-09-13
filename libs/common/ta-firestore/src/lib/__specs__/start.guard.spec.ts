import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { startGuard } from '../start.guard';
import { AuthService } from '../auth.service';
import { RequestedUrlService } from '../requested-url.service';

describe('startGuard', () => {
  let getMember: jest.Mock;
  let parseUrl: jest.Mock;
  let requestedUrlService: RequestedUrlService;

  const runGuard = (): boolean | UrlTree =>
    TestBed.runInInjectionContext(
      () =>
        startGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as
          boolean | UrlTree,
    );

  beforeEach(() => {
    getMember = jest.fn(() => undefined);
    parseUrl = jest.fn(
      (url: string): UrlTree => ({ url }) as unknown as UrlTree,
    );

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { getMember } },
        { provide: Router, useValue: { parseUrl } },
      ],
    });

    requestedUrlService = TestBed.inject(RequestedUrlService);
  });

  it('shows the welcome page to a visitor without a session', () => {
    expect(runGuard()).toBe(true);
  });

  it('forwards a signed-in visitor to home', () => {
    getMember.mockReturnValue({ uid: 'user-1' });

    expect(runGuard()).toEqual({ url: '/home' });
  });

  it('forwards a signed-in visitor to the URL they originally asked for', () => {
    getMember.mockReturnValue({ uid: 'user-1' });
    requestedUrlService.remember('/bite/shared-123');

    expect(runGuard()).toEqual({ url: '/bite/shared-123' });
    expect(requestedUrlService.consume()).toBeUndefined();
  });

  /**
   * A guest who scanned a table code holds an anonymous session, and it must
   * not carry them into the app. `getMember` answers `null` for one, so they
   * see the welcome page like any other visitor - which is the whole point of
   * the anonymous session being an identity for a table and not a login
   * (issue #1101).
   */
  it('shows the welcome page to a guest holding an anonymous session', () => {
    getMember.mockReturnValue(null);

    expect(runGuard()).toBe(true);
  });
});
