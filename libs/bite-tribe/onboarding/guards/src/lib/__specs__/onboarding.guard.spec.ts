import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { OnboardingDataAccessService } from 'bite-tribe/onboarding-data-access';
import { onboardingGuard } from '../onboarding.guard';

describe('onboardingGuard', () => {
  let isOnboardingComplete: jest.Mock;
  let dismissedForSession: jest.Mock;
  let parseUrl: jest.Mock;

  const runGuard = (): Promise<boolean | UrlTree> =>
    TestBed.runInInjectionContext(() =>
      (onboardingGuard as () => Promise<boolean | UrlTree>)(),
    );

  beforeEach(() => {
    isOnboardingComplete = jest.fn();
    dismissedForSession = jest.fn(() => false);
    parseUrl = jest.fn(
      (url: string): UrlTree => ({ url }) as unknown as UrlTree,
    );

    TestBed.configureTestingModule({
      providers: [
        {
          provide: OnboardingDataAccessService,
          useValue: { isOnboardingComplete, dismissedForSession },
        },
        { provide: Router, useValue: { parseUrl } },
      ],
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('allows navigation when onboarding is complete', async () => {
    isOnboardingComplete.mockResolvedValue(true);

    await expect(runGuard()).resolves.toBe(true);
  });

  it('redirects to the onboarding route when incomplete', async () => {
    isOnboardingComplete.mockResolvedValue(false);

    const result = await runGuard();

    expect(parseUrl).toHaveBeenCalledWith('/onboarding');
    expect(result).toEqual({ url: '/onboarding' });
  });

  it('allows navigation after a session dismissal without reading state', async () => {
    dismissedForSession.mockReturnValue(true);

    await expect(runGuard()).resolves.toBe(true);
    expect(isOnboardingComplete).not.toHaveBeenCalled();
  });
});
