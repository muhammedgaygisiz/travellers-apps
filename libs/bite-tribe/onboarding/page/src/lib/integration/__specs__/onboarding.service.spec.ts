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
  let navigateRoot: jest.Mock;

  const setup = (completed: OnboardingStepId[] = []): void => {
    loadCompletedSteps = jest.fn().mockResolvedValue(completed);
    saveCompletedSteps = jest.fn().mockResolvedValue(undefined);
    dismissForSession = jest.fn();
    navigateRoot = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        OnboardingService,
        {
          provide: OnboardingDataAccessService,
          useValue: { dismissForSession },
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

      service.setCurrentStepValid(true);
      await service.next();

      expect(service.currentStep().id).toBe('visibility');
      expect(saveCompletedSteps).toHaveBeenCalledWith(['identity']);
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
});
