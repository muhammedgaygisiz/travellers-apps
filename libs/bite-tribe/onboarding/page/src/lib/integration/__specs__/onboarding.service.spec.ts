import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular';
import {
  OnboardingDataAccessService,
  OnboardingProgressService,
  OnboardingStepId,
} from 'bite-tribe/onboarding-data-access';
import { PATH } from 'utils';
import { OnboardingService } from '../onboarding.service';
import { ONBOARDING_STEPS } from '../../steps/onboarding-steps';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let loadCompletedSteps: jest.Mock;
  let saveCompletedSteps: jest.Mock;
  let dismissForSession: jest.Mock;
  let loadCurrentProfile: jest.Mock;
  let checkDisplayNameAvailability: jest.Mock;
  let claimDisplayName: jest.Mock;
  let saveProfile: jest.Mock;
  let navigateRoot: jest.Mock;

  const setup = (completed: OnboardingStepId[] = []): void => {
    loadCompletedSteps = jest.fn().mockResolvedValue(completed);
    saveCompletedSteps = jest.fn().mockResolvedValue(undefined);
    dismissForSession = jest.fn();
    loadCurrentProfile = jest.fn().mockResolvedValue({
      userId: 'user-1',
      displayName: 'CurrentName',
      normalizedDisplayName: 'currentname',
      fullName: 'Current Name',
      email: 'current@example.com',
      photoUrl: 'current-photo',
      public: false,
    });
    checkDisplayNameAvailability = jest.fn().mockResolvedValue({
      available: true,
      normalizedDisplayName: 'newname',
    });
    claimDisplayName = jest.fn().mockResolvedValue({
      displayName: 'NewName',
      normalizedDisplayName: 'newname',
    });
    saveProfile = jest.fn(async (profile) => profile);
    navigateRoot = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        OnboardingService,
        {
          provide: OnboardingDataAccessService,
          useValue: {
            dismissForSession,
            loadCurrentProfile,
            checkDisplayNameAvailability,
            claimDisplayName,
            saveProfile,
          },
        },
        {
          provide: OnboardingProgressService,
          useValue: { loadCompletedSteps, saveCompletedSteps },
        },
        { provide: NavController, useValue: { navigateRoot } },
      ],
    });

    service = TestBed.inject(OnboardingService);
  };

  afterEach(() => jest.clearAllMocks());

  it('exposes the steps in the configured order', () => {
    setup();

    expect(service.steps.map((step) => step.id)).toEqual([
      'identity',
      'visibility',
      'currency',
      'language',
      'notifications',
      'finish',
    ]);
  });

  describe('initialize', () => {
    it('starts at the first step when nothing is persisted', async () => {
      setup([]);

      await service.initialize();

      expect(service.currentIndex()).toBe(0);
      expect(service.canAdvance()).toBe(false);
      expect(loadCurrentProfile).toHaveBeenCalledTimes(1);
    });

    it('resumes at the first incomplete step', async () => {
      setup(['identity', 'visibility']);

      await service.initialize();

      expect(service.currentStep().id).toBe('currency');
    });

    it('treats already completed steps as valid so the user can move on', async () => {
      setup(['identity']);

      await service.initialize();
      service.back();

      expect(service.currentStep().id).toBe('identity');
      expect(service.canAdvance()).toBe(true);
    });

    it('lands on the final step when every step is complete', async () => {
      setup(ONBOARDING_STEPS.map((step) => step.id));

      await service.initialize();

      expect(service.currentIndex()).toBe(ONBOARDING_STEPS.length - 1);
    });

    it('ignores unknown persisted step ids', async () => {
      setup(['identity', 'ghost-step' as OnboardingStepId]);

      await service.initialize();

      expect(service.currentStep().id).toBe('visibility');
    });

    it('does not reload progress on repeated calls', async () => {
      setup(['identity']);

      await service.initialize();
      await service.initialize();

      expect(loadCompletedSteps).toHaveBeenCalledTimes(1);
    });
  });

  describe('next', () => {
    it('does not advance while the current step is invalid', async () => {
      setup();
      await service.initialize();

      await service.next();

      expect(service.currentIndex()).toBe(0);
      expect(saveCompletedSteps).not.toHaveBeenCalled();
    });

    it('advances and persists the completed step once valid', async () => {
      setup();
      await service.initialize();

      service.updateIdentity({ displayName: 'NewName', photoUrl: 'new-photo' });
      await service.checkDisplayNameAvailability('NewName');
      await service.next();

      expect(service.currentStep().id).toBe('visibility');
      expect(claimDisplayName).toHaveBeenCalledWith('NewName');
      expect(saveProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'NewName',
          normalizedDisplayName: 'newname',
          photoUrl: 'new-photo',
        }),
      );
      expect(saveCompletedSteps).toHaveBeenCalledWith(['identity']);
    });

    it('does not leave identity when the display name claim fails', async () => {
      setup();
      claimDisplayName.mockRejectedValue(
        Object.assign(new Error('display_name_taken'), {
          code: 'already-exists',
        }),
      );
      await service.initialize();

      service.updateIdentity({ displayName: 'Taken', photoUrl: '' });
      await service.checkDisplayNameAvailability('Taken');
      await service.next();

      expect(service.currentStep().id).toBe('identity');
      expect(service.displayNameAvailability()).toBe('taken');
      expect(saveCompletedSteps).not.toHaveBeenCalled();
    });

    it('persists visibility only after the user makes an explicit choice', async () => {
      setup(['identity']);
      await service.initialize();

      expect(service.currentStep().id).toBe('visibility');
      expect(service.canAdvance()).toBe(false);

      service.updateVisibility(true);
      await service.next();

      expect(saveProfile).toHaveBeenCalledWith(
        expect.objectContaining({ public: true }),
      );
      expect(saveCompletedSteps).toHaveBeenCalledWith([
        'identity',
        'visibility',
      ]);
      expect(service.currentStep().id).toBe('currency');
    });

    it('finishes on the last step by releasing the gate and entering the app', async () => {
      setup(ONBOARDING_STEPS.slice(0, -1).map((step) => step.id));
      await service.initialize();

      expect(service.currentStep().id).toBe('finish');
      service.setCurrentStepValid(true);
      await service.next();

      expect(saveCompletedSteps).toHaveBeenCalledWith(
        ONBOARDING_STEPS.map((step) => step.id),
      );
      expect(dismissForSession).toHaveBeenCalledTimes(1);
      expect(navigateRoot).toHaveBeenCalledWith([`/${PATH.HOME}`]);
    });
  });

  describe('back', () => {
    it('moves to the previous step', async () => {
      setup(['identity', 'visibility']);
      await service.initialize();

      expect(service.currentStep().id).toBe('currency');
      service.back();

      expect(service.currentStep().id).toBe('visibility');
    });

    it('never moves before the first step', async () => {
      setup();
      await service.initialize();

      service.back();

      expect(service.currentIndex()).toBe(0);
    });
  });

  describe('setCurrentStepValid', () => {
    it('toggles validity for the active step only', async () => {
      setup();
      await service.initialize();

      service.setCurrentStepValid(true);
      expect(service.canAdvance()).toBe(true);

      service.setCurrentStepValid(false);
      expect(service.canAdvance()).toBe(false);
    });
  });

  describe('checkDisplayNameAvailability', () => {
    it('marks identity valid when the current display name is available', async () => {
      setup();
      await service.initialize();

      service.updateIdentity({ displayName: 'NewName', photoUrl: '' });
      await service.checkDisplayNameAvailability('NewName');

      expect(service.displayNameAvailability()).toBe('available');
      expect(service.canAdvance()).toBe(true);
    });

    it('ignores stale availability responses', async () => {
      setup();
      let resolveFirst!: (value: {
        available: boolean;
        normalizedDisplayName: string;
      }) => void;
      checkDisplayNameAvailability
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
        )
        .mockResolvedValueOnce({
          available: true,
          normalizedDisplayName: 'second',
        });
      await service.initialize();

      service.updateIdentity({ displayName: 'First', photoUrl: '' });
      const firstCheck = service.checkDisplayNameAvailability('First');
      service.updateIdentity({ displayName: 'Second', photoUrl: '' });
      await service.checkDisplayNameAvailability('Second');
      resolveFirst({ available: false, normalizedDisplayName: 'first' });
      await firstCheck;

      expect(service.displayNameAvailability()).toBe('available');
      expect(service.canAdvance()).toBe(true);
    });
  });
});
