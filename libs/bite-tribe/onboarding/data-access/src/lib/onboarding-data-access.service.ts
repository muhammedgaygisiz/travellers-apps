import { inject, Injectable, signal } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { AuthService } from 'ta-firestore';
import type { PublicUser } from 'model';

const USERS_COLLECTION = 'users';

/**
 * Reads the onboarding completion state for the current user.
 *
 * Completion is marked on the `/users/{userId}` document
 * (`onboardingCompletedAt`). The write happens in the finish step of the
 * assistant (completion issue); this service only reads the flag so the entry
 * gate can decide whether the assistant must be shown.
 *
 * The result is cached for the session once completion is observed, and a
 * session-scoped dismissal lets the placeholder page release the gate while the
 * real assistant is still a follow-up (epic #850, issue #1011).
 */
@Injectable({ providedIn: 'root' })
export class OnboardingDataAccessService {
  private readonly authService = inject(AuthService);

  private readonly completed = signal(false);
  readonly dismissedForSession = signal(false);

  async isOnboardingComplete(): Promise<boolean> {
    if (this.completed()) {
      return true;
    }

    const uid = this.authService.getUser()?.uid;
    if (!uid) {
      return false;
    }

    try {
      const result = await FirebaseFirestore.getDocument({
        reference: `${USERS_COLLECTION}/${uid}`,
      });

      const user = result.snapshot?.data as PublicUser | undefined;
      const isComplete = !!user?.onboardingCompletedAt;

      if (isComplete) {
        this.completed.set(true);
      }

      return isComplete;
    } catch (error) {
      console.warn('Failed to read onboarding completion state:', error);
      return false;
    }
  }

  dismissForSession(): void {
    this.dismissedForSession.set(true);
  }
}
