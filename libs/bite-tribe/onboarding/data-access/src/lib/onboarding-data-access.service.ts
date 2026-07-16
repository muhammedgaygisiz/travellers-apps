import { inject, Injectable, signal } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { AuthService } from 'ta-firestore';
import type { PublicUser } from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';

const USERS_COLLECTION = 'users';

export interface DisplayNameAvailability {
  available: boolean;
  normalizedDisplayName: string;
}

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
  private readonly api = inject(BiteTribeApiService);

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

  async loadCurrentProfile(): Promise<PublicUser | undefined> {
    const authUser = this.authService.getUser();
    const uid = authUser?.uid;
    if (!uid) {
      return undefined;
    }

    try {
      const result = await FirebaseFirestore.getDocument({
        reference: `${USERS_COLLECTION}/${uid}`,
      });

      return this.toPublicUser(uid, authUser, result.snapshot?.data);
    } catch (error) {
      console.warn('Failed to read onboarding profile:', error);
      return this.toPublicUser(uid, authUser);
    }
  }

  checkDisplayNameAvailability(
    displayName: string,
  ): Promise<DisplayNameAvailability> {
    return this.api.checkDisplayNameAvailability(displayName);
  }

  claimDisplayName(
    displayName: string,
  ): Promise<{ displayName: string; normalizedDisplayName: string }> {
    return this.api.claimDisplayName(displayName);
  }

  saveProfile(profile: PublicUser): Promise<PublicUser> {
    return this.api.updateUser(profile);
  }

  private toPublicUser(
    uid: string,
    authUser: ReturnType<AuthService['getUser']>,
    data?: unknown,
  ): PublicUser {
    const current = (data ?? {}) as Partial<PublicUser>;
    const providerPhotoUrl = this.getProviderPhotoUrl(authUser);
    const authDisplayName =
      typeof authUser?.displayName === 'string' ? authUser.displayName : '';
    const authEmail = typeof authUser?.email === 'string' ? authUser.email : '';
    const authPhotoUrl =
      typeof authUser?.photoUrl === 'string' ? authUser.photoUrl : '';

    return {
      displayName: current.displayName || authDisplayName || '',
      normalizedDisplayName: current.normalizedDisplayName,
      fullName: current.fullName || authDisplayName || '',
      email: current.email || authEmail || '',
      photoUrl: current.photoUrl || providerPhotoUrl || authPhotoUrl || '',
      userId: current.userId || uid,
      city: current.city || '',
      about: current.about || '',
      public: current.public ?? false,
      biteCount: current.biteCount,
      subscriptionTier: current.subscriptionTier,
      isOrganisation: current.isOrganisation,
      isRestaurant: current.isRestaurant,
      countryCodes: current.countryCodes,
      createdAt: current.createdAt,
      createdAtTimestamp: current.createdAtTimestamp,
      updatedAt: current.updatedAt,
      updatedAtTimestamp: current.updatedAtTimestamp,
      lastSeen: current.lastSeen,
      lastSeenTimestamp: current.lastSeenTimestamp,
      appVersion: current.appVersion,
      appBuildNumber: current.appBuildNumber,
      emailVerified: current.emailVerified,
      emailVerificationRequired: current.emailVerificationRequired,
      emailVerificationProvider: current.emailVerificationProvider,
      emailVerificationReminderCount: current.emailVerificationReminderCount,
      emailVerificationLastSentAt: current.emailVerificationLastSentAt,
      emailVerificationLastSentAtTimestamp:
        current.emailVerificationLastSentAtTimestamp,
      emailVerificationManualLastSentAt:
        current.emailVerificationManualLastSentAt,
      emailVerificationManualLastSentAtTimestamp:
        current.emailVerificationManualLastSentAtTimestamp,
      onboardingCompletedAt: current.onboardingCompletedAt,
      onboardingCompletedAtTimestamp: current.onboardingCompletedAtTimestamp,
      onboardingVersion: current.onboardingVersion,
    };
  }

  private getProviderPhotoUrl(
    authUser: ReturnType<AuthService['getUser']>,
  ): string {
    const providerData = (authUser as { providerData?: unknown } | null)
      ?.providerData;

    if (!Array.isArray(providerData)) {
      return '';
    }

    const provider = providerData.find(
      (data): data is { photoUrl?: string; photoURL?: string } =>
        typeof data === 'object' && data !== null,
    );

    return provider?.photoUrl || provider?.photoURL || '';
  }
}
