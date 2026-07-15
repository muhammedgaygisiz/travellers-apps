import { computed, inject, Injectable, signal } from '@angular/core';
import { NavController } from '@ionic/angular';
import { PATH } from 'utils';
import {
  OnboardingDataAccessService,
  OnboardingProgressService,
  OnboardingStepId,
} from 'bite-tribe/onboarding-data-access';
import { ONBOARDING_STEPS } from '../steps/onboarding-steps';

/**
 * Owns onboarding assistant navigation: the ordered step registry, per-step
 * validity, and progress persistence.
 *
 * Steps render in order and cannot be skipped. A step can only be left once its
 * mandatory inputs are valid and acknowledged, and there is no exit before the
 * final step. Completed steps are persisted so a restart resumes at the first
 * incomplete step (epic #850, issue #1013).
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly dataAccess = inject(OnboardingDataAccessService);
  private readonly progress = inject(OnboardingProgressService);
  private readonly navController = inject(NavController);

  readonly steps = ONBOARDING_STEPS;

  private readonly completedSteps = signal<ReadonlySet<OnboardingStepId>>(
    new Set(),
  );
  private readonly validSteps = signal<ReadonlySet<OnboardingStepId>>(
    new Set(),
  );

  readonly currentIndex = signal(0);

  readonly currentStep = computed(() => this.steps[this.currentIndex()]);

  readonly isCurrentStepValid = computed(() =>
    this.validSteps().has(this.currentStep().id),
  );

  /** Whether the shell may advance from the current step. */
  readonly canAdvance = this.isCurrentStepValid;

  private initialized = false;

  /**
   * Loads persisted progress and positions the assistant at the first
   * incomplete step. Runs once per app session; re-entering the route does not
   * reset the user's place in the flow.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    const completed = (await this.progress.loadCompletedSteps()).filter((id) =>
      this.isKnownStep(id),
    );
    const completedSet = new Set(completed);

    this.completedSteps.set(completedSet);
    // Already-completed steps stay valid so a returning user can move forward.
    this.validSteps.set(new Set(completedSet));
    this.currentIndex.set(this.firstIncompleteIndex(completedSet));
  }

  setCurrentStepValid(valid: boolean): void {
    const id = this.currentStep().id;

    this.validSteps.update((set) => {
      const next = new Set(set);
      if (valid) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  async next(): Promise<void> {
    if (!this.canAdvance()) {
      return;
    }

    await this.markComplete(this.currentStep().id);

    if (this.currentIndex() >= this.steps.length - 1) {
      this.finish();
      return;
    }

    this.currentIndex.update((index) => index + 1);
  }

  back(): void {
    this.currentIndex.update((index) => Math.max(0, index - 1));
  }

  private finish(): void {
    // The durable completion flag write lands with the finish step (#1016).
    // Until then, completing the flow releases the session gate and enters the
    // app so the shell is usable end to end.
    this.dataAccess.dismissForSession();
    void this.navController.navigateRoot([`/${PATH.HOME}`]);
  }

  private async markComplete(id: OnboardingStepId): Promise<void> {
    this.completedSteps.update((set) => new Set(set).add(id));
    await this.progress.saveCompletedSteps([...this.completedSteps()]);
  }

  private firstIncompleteIndex(
    completed: ReadonlySet<OnboardingStepId>,
  ): number {
    const index = this.steps.findIndex((step) => !completed.has(step.id));
    return index === -1 ? this.steps.length - 1 : index;
  }

  private isKnownStep(id: OnboardingStepId): boolean {
    return this.steps.some((step) => step.id === id);
  }
}
