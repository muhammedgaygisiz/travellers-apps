import { computed, inject, Injectable, signal } from '@angular/core';
import { NavController } from '@ionic/angular';
import { getDisplayNameFailureReason, PATH } from 'utils';
import {
  OnboardingDataAccessService,
  OnboardingProgressService,
  OnboardingStepId,
} from 'bite-tribe/onboarding-data-access';
import type { PublicUser } from 'model';
import { ONBOARDING_STEPS } from '../steps/onboarding-steps';
import type {
  DisplayNameAvailabilityState,
  OnboardingIdentityDraft,
} from '../components/identity-step/identity-step.component';

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

  readonly profile = signal<PublicUser | undefined>(undefined);
  readonly identityDraft = signal<OnboardingIdentityDraft>({
    displayName: '',
    photoUrl: '',
  });
  readonly displayNameAvailability =
    signal<DisplayNameAvailabilityState>('idle');
  readonly selectedVisibility = signal<boolean | null>(false);
  readonly visibilitySelectionExplicit = signal(false);

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

    const profile = await this.dataAccess.loadCurrentProfile();
    this.profile.set(profile);
    this.identityDraft.set({
      displayName: profile?.displayName || '',
      photoUrl: profile?.photoUrl || '',
    });
    this.selectedVisibility.set(profile?.public ?? false);

    const displayName = this.identityDraft().displayName.trim();
    if (this.currentStep().id === 'identity' && displayName) {
      await this.checkDisplayNameAvailability(displayName);
    }
  }

  setCurrentStepValid(valid: boolean): void {
    const id = this.currentStep().id;
    this.setStepValid(id, valid);
  }

  updateIdentity(draft: OnboardingIdentityDraft): void {
    this.identityDraft.set(draft);

    const displayName = draft.displayName.trim();
    if (!displayName) {
      this.displayNameAvailability.set('idle');
      this.setStepValid('identity', false);
      return;
    }

    this.setStepValid(
      'identity',
      this.displayNameAvailability() === 'available',
    );
  }

  async checkDisplayNameAvailability(displayName: string): Promise<void> {
    const requestedDisplayName = displayName.trim();
    if (!requestedDisplayName) {
      this.displayNameAvailability.set('idle');
      this.setStepValid('identity', false);
      return;
    }

    this.displayNameAvailability.set('checking');

    try {
      const result =
        await this.dataAccess.checkDisplayNameAvailability(
          requestedDisplayName,
        );

      if (this.identityDraft().displayName !== requestedDisplayName) {
        return;
      }

      this.displayNameAvailability.set(
        result.available ? 'available' : 'taken',
      );
      this.setStepValid('identity', result.available);
    } catch (error) {
      const reason = getDisplayNameFailureReason(error);
      this.displayNameAvailability.set(
        reason === 'invalid' ? 'invalid' : 'error',
      );
      this.setStepValid('identity', false);
    }
  }

  updateVisibility(isPublic: boolean): void {
    this.selectedVisibility.set(isPublic);
    this.visibilitySelectionExplicit.set(true);
    this.setStepValid('visibility', true);
  }

  private setStepValid(id: OnboardingStepId, valid: boolean): void {
    if (id === 'visibility' && !this.visibilitySelectionExplicit()) {
      valid = false;
    }

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

    if (!(await this.persistCurrentStep())) {
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

  private async persistCurrentStep(): Promise<boolean> {
    const id = this.currentStep().id;

    if (id === 'identity') {
      return this.persistIdentityStep();
    }

    if (id === 'visibility') {
      return this.persistVisibilityStep();
    }

    return true;
  }

  private async persistIdentityStep(): Promise<boolean> {
    const profile = this.profile();
    const draft = this.identityDraft();
    const displayName = draft.displayName.trim();

    if (!profile || !displayName) {
      this.setStepValid('identity', false);
      return false;
    }

    try {
      const claim = await this.dataAccess.claimDisplayName(displayName);
      const updated = await this.dataAccess.saveProfile({
        ...profile,
        displayName: claim.displayName,
        normalizedDisplayName: claim.normalizedDisplayName,
        fullName: profile.fullName || claim.displayName,
        photoUrl: draft.photoUrl || '',
      });
      this.profile.set(updated);
      return true;
    } catch (error) {
      const reason = getDisplayNameFailureReason(error);
      this.displayNameAvailability.set(
        reason === 'taken'
          ? 'taken'
          : reason === 'invalid'
            ? 'invalid'
            : 'error',
      );
      this.setStepValid('identity', false);
      return false;
    }
  }

  private async persistVisibilityStep(): Promise<boolean> {
    const profile = this.profile();

    if (!profile || !this.visibilitySelectionExplicit()) {
      this.setStepValid('visibility', false);
      return false;
    }

    const updated = await this.dataAccess.saveProfile({
      ...profile,
      public: this.selectedVisibility() === true,
    });
    this.profile.set(updated);
    return true;
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
