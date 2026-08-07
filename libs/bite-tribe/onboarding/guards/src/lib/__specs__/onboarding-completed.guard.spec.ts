import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { OnboardingDataAccessService } from 'bite-tribe/onboarding-data-access';
import { RequestedUrlService } from 'ta-firestore';
import { onboardingCompletedGuard } from '../onboarding-completed.guard';

describe('onboardingCompletedGuard', () => {
  let isOnboardingComplete: jest.Mock;
  let parseUrl: jest.Mock;
  let requestedUrlService: RequestedUrlService;

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

    requestedUrlService = TestBed.inject(RequestedUrlService);
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

  it('redirects them to the URL that was displaced by the gate', async () => {
    isOnboardingComplete.mockResolvedValue(true);
    requestedUrlService.remember('/bite/shared-123');

    const result = await runGuard();

    expect(result).toEqual({ url: '/bite/shared-123' });
  });
});
