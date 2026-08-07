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
  let authState: jest.Mock;
  let parseUrl: jest.Mock;
  let requestedUrlService: RequestedUrlService;

  const runGuard = (): boolean | UrlTree =>
    TestBed.runInInjectionContext(
      () =>
        startGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as
          boolean | UrlTree,
    );

  beforeEach(() => {
    authState = jest.fn(() => undefined);
    parseUrl = jest.fn(
      (url: string): UrlTree => ({ url }) as unknown as UrlTree,
    );

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { authState } },
        { provide: Router, useValue: { parseUrl } },
      ],
    });

    requestedUrlService = TestBed.inject(RequestedUrlService);
  });

  it('shows the welcome page to a visitor without a session', () => {
    expect(runGuard()).toBe(true);
  });

  it('forwards a signed-in visitor to home', () => {
    authState.mockReturnValue({ user: { uid: 'user-1' } });

    expect(runGuard()).toEqual({ url: '/home' });
  });

  it('forwards a signed-in visitor to the URL they originally asked for', () => {
    authState.mockReturnValue({ user: { uid: 'user-1' } });
    requestedUrlService.remember('/bite/shared-123');

    expect(runGuard()).toEqual({ url: '/bite/shared-123' });
    expect(requestedUrlService.consume()).toBeUndefined();
  });
});
