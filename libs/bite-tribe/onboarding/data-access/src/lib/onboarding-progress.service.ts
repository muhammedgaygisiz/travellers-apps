import { inject, Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { AuthService } from 'ta-firestore';
import type { OnboardingStepId } from './onboarding-step-id';

const PROGRESS_KEY_PREFIX = 'onboarding-progress:';

/**
 * Persists which onboarding steps the current user has already completed so the
 * assistant can resume at the first incomplete step after the app is killed and
 * restarted mid-flow.
 *
 * Progress lives in device {@link Preferences}, keyed per user id. The durable
 * onboarding completion flag itself is written to Firestore in the finish step
 * (epic #850, issue #1016); this service only tracks the in-progress resume
 * state (issue #1013).
 */
@Injectable({ providedIn: 'root' })
export class OnboardingProgressService {
  private readonly authService = inject(AuthService);

  async loadCompletedSteps(): Promise<OnboardingStepId[]> {
    const key = this.storageKey();
    if (!key) {
      return [];
    }

    try {
      const { value } = await Preferences.get({ key });
      if (!value) {
        return [];
      }

      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as OnboardingStepId[]) : [];
    } catch (error) {
      console.warn('Failed to read onboarding progress:', error);
      return [];
    }
  }

  async saveCompletedSteps(steps: readonly OnboardingStepId[]): Promise<void> {
    const key = this.storageKey();
    if (!key) {
      return;
    }

    try {
      await Preferences.set({ key, value: JSON.stringify([...steps]) });
    } catch (error) {
      console.warn('Failed to persist onboarding progress:', error);
    }
  }

  async clear(): Promise<void> {
    const key = this.storageKey();
    if (!key) {
      return;
    }

    try {
      await Preferences.remove({ key });
    } catch (error) {
      console.warn('Failed to clear onboarding progress:', error);
    }
  }

  private storageKey(): string | null {
    const uid = this.authService.getUser()?.uid;
    return uid ? `${PROGRESS_KEY_PREFIX}${uid}` : null;
  }
}
