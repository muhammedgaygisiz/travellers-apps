import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { OnboardingDataAccessService } from 'bite-tribe/onboarding-data-access';
import { onboardingCompletedGuard } from '../onboarding-completed.guard';

describe('onboardingCompletedGuard', () => {
  let isOnboardingComplete: jest.Mock;
  let parseUrl: jest.Mock;

  const runGuard = (): Promise<boolean | UrlTree> =>
    TestBed.runInInjectionContext(() =>
      (onboardingCompletedGuard as () => Promise<boolean | UrlTree>)(),
    );

  beforeEach(() => {
    isOnboardingComplete = jest.fn();
    parseUrl = jest.fn(
      (url: string): UrlTree => ({ url }) as unknown as UrlTree,
    );

    TestBed.configureTestingModule({
      providers: [
        {
          provide: OnboardingDataAccessService,
          useValue: { isOnboardingComplete },
        },
        { provide: Router, useValue: { parseUrl } },
      ],
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('allows viewing the onboarding route when incomplete', async () => {
    isOnboardingComplete.mockResolvedValue(false);

    await expect(runGuard()).resolves.toBe(true);
  });

  it('redirects completed users into the app', async () => {
    isOnboardingComplete.mockResolvedValue(true);

    const result = await runGuard();

    expect(parseUrl).toHaveBeenCalledWith('/home');
    expect(result).toEqual({ url: '/home' });
  });
});
