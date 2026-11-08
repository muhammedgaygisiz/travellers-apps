import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { OnboardingDataAccessService } from 'bite-tribe/onboarding-data-access';
import { RequestedUrlService } from 'ta-firestore';
import { onboardingGuard } from '../onboarding.guard';

describe('onboardingGuard', () => {
  let onboardingState: jest.Mock;
  let dismissedForSession: jest.Mock;
  let parseUrl: jest.Mock;
  let requestedUrlService: RequestedUrlService;

  const runGuard = (url = '/home'): Promise<boolean | UrlTree> =>
    TestBed.runInInjectionContext(
      () =>
        onboardingGuard(
          {} as ActivatedRouteSnapshot,
          { url } as RouterStateSnapshot,
        ) as Promise<boolean | UrlTree>,
    );

  beforeEach(() => {
    onboardingState = jest.fn();
    dismissedForSession = jest.fn(() => false);
    parseUrl = jest.fn(
      (url: string): UrlTree => ({ url }) as unknown as UrlTree,
    );

    TestBed.configureTestingModule({
      providers: [
        {
          provide: OnboardingDataAccessService,
          useValue: { onboardingState, dismissedForSession },
        },
        { provide: Router, useValue: { parseUrl } },
      ],
    });

    requestedUrlService = TestBed.inject(RequestedUrlService);
  });

  afterEach(() => jest.clearAllMocks());

  it('allows navigation when onboarding is complete', async () => {
    onboardingState.mockResolvedValue('complete');

    await expect(runGuard()).resolves.toBe(true);
  });

  it('redirects to the onboarding route when incomplete', async () => {
    onboardingState.mockResolvedValue('incomplete');

    const result = await runGuard();

    expect(parseUrl).toHaveBeenCalledWith('/onboarding');
    expect(result).toEqual({ url: '/onboarding' });
  });

  it('remembers the displaced URL so the assistant can hand it back', async () => {
    onboardingState.mockResolvedValue('incomplete');

    await runGuard('/bite/shared-123');

    expect(requestedUrlService.consume()).toBe('/bite/shared-123');
  });

  // Issue #1903: a refused read is not evidence the account never onboarded.
  it('allows navigation when the onboarding state cannot be read', async () => {
    onboardingState.mockResolvedValue('unknown');

    await expect(runGuard()).resolves.toBe(true);
    expect(parseUrl).not.toHaveBeenCalled();
  });

  it('does not remember the URL when the state cannot be read', async () => {
    onboardingState.mockResolvedValue('unknown');

    await runGuard('/bite/shared-123');

    expect(requestedUrlService.consume()).toBeUndefined();
  });

  it('allows navigation after a session dismissal without reading state', async () => {
    dismissedForSession.mockReturnValue(true);

    await expect(runGuard()).resolves.toBe(true);
    expect(onboardingState).not.toHaveBeenCalled();
  });
});
