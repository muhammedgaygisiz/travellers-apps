import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  GuardResult,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { OnboardingDataAccessService } from 'bite-tribe/onboarding-data-access';
import { publicMenuMemberGuard } from 'bite-tribe/store';
import { publicMenuGuard } from '../public-menu.guard';

jest.mock('bite-tribe/store', () => ({
  publicMenuMemberGuard: jest.fn(),
}));

const IN_APP_MENU = { url: '/restaurant/r-1/menu/m-1' } as unknown as UrlTree;

describe('publicMenuGuard', () => {
  const memberGuard = publicMenuMemberGuard as jest.MockedFunction<
    typeof publicMenuMemberGuard
  >;
  let isOnboardingComplete: jest.Mock;
  let dismissedForSession: jest.Mock;

  const runGuard = (): Promise<GuardResult> =>
    TestBed.runInInjectionContext(
      () =>
        publicMenuGuard(
          {} as ActivatedRouteSnapshot,
          { url: '/m/r-1' } as RouterStateSnapshot,
        ) as Promise<GuardResult>,
    );

  beforeEach(() => {
    memberGuard.mockReset();
    isOnboardingComplete = jest.fn(async () => true);
    dismissedForSession = jest.fn(() => false);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: OnboardingDataAccessService,
          useValue: { isOnboardingComplete, dismissedForSession },
        },
      ],
    });
  });

  it('hands an onboarded member on to the app’s own menu page', async () => {
    memberGuard.mockResolvedValue(IN_APP_MENU);

    await expect(runGuard()).resolves.toBe(IN_APP_MENU);
  });

  /**
   * The case the issue exists for: the in-app menu page carries the
   * onboarding gate, so handing this member there would put the assistant in
   * front of the menu. A stranger reads it straight away; so do they.
   */
  it('leaves a member who has not finished onboarding on the public page', async () => {
    memberGuard.mockResolvedValue(IN_APP_MENU);
    isOnboardingComplete.mockResolvedValue(false);

    await expect(runGuard()).resolves.toBe(true);
  });

  it('honours a session dismissal without reading state', async () => {
    memberGuard.mockResolvedValue(IN_APP_MENU);
    dismissedForSession.mockReturnValue(true);

    await expect(runGuard()).resolves.toBe(IN_APP_MENU);
    expect(isOnboardingComplete).not.toHaveBeenCalled();
  });

  /**
   * A reader with no account, an anonymous table guest, and a member at a
   * restaurant with no menu are all let through by the member guard. None of
   * them has an onboarding to ask about.
   */
  it('asks nothing of a reader the member guard lets through', async () => {
    memberGuard.mockResolvedValue(true);

    await expect(runGuard()).resolves.toBe(true);
    expect(dismissedForSession).not.toHaveBeenCalled();
    expect(isOnboardingComplete).not.toHaveBeenCalled();
  });
});
