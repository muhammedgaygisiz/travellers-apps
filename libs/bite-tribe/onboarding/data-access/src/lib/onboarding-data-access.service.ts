import { inject, Injectable, signal } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { AuthService } from 'ta-firestore';
import type { PublicUser, Settings } from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { Preferences } from '@capacitor/preferences';
import { TranslocoService } from '@jsverse/transloco';
import { Platform } from '@ionic/angular';
import {
  requestPushPermission,
  type PushPermissionResult,
} from 'push-notifications';
import {
  requestLocationPermission,
  type LocationPermissionResult,
} from 'geolocation';

const USERS_COLLECTION = 'users';
const LANGUAGE_PREFERENCE_KEY = 'lang';

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
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly transloco = inject(TranslocoService);
  private readonly platform = inject(Platform);

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

  /**
   * Writes the profile and syncs the store, so surfaces reading the profile
   * (the profile page's avatar and display name) show the onboarding choice
   * without a reload.
   *
   * The assistant writes through the API rather than the store's save action,
   * so nothing else dispatches the result. The store profile is only loaded at
   * login, which would otherwise leave it on the pre-onboarding snapshot.
   */
  async saveProfile(profile: PublicUser): Promise<PublicUser> {
    const updated = await this.api.updateUser(profile);
    this.storeService.notifySavedProfile(updated);

    return updated;
  }

  async loadSettings(): Promise<Settings | undefined> {
    try {
      const settings = await this.api.loadSettings();
      // A user without a settings document yet reads back as an empty object.
      return settings && Object.keys(settings).length > 0
        ? settings
        : undefined;
    } catch (error) {
      console.warn('Failed to read onboarding settings:', error);
      return undefined;
    }
  }

  /**
   * Writes the full settings document and syncs the store so surfaces reading
   * settings (currency formatting, language) see the onboarding choice at once.
   *
   * The caller must pass complete settings: the settings API replaces the
   * document rather than merging, so a partial write would drop unrelated keys.
   */
  async saveSettings(settings: Settings): Promise<void> {
    await this.api.saveSettings(settings);
    this.storeService.notifySavedSettings(settings);
  }

  /**
   * Switches the app language immediately and persists it for the next start.
   *
   * The settings page reloads the document to apply a language change; the
   * assistant cannot, because a reload would tear down the in-progress flow.
   * Transloco swaps the active language in place instead.
   */
  async applyLanguage(language: string): Promise<void> {
    try {
      await Preferences.set({
        key: LANGUAGE_PREFERENCE_KEY,
        value: language,
      });
    } catch (error) {
      console.warn('Failed to persist onboarding language preference:', error);
    }

    this.transloco.setActiveLang(language);
  }

  requestPushPermission(): Promise<PushPermissionResult> {
    return requestPushPermission(this.platform);
  }

  requestLocationPermission(): Promise<LocationPermissionResult> {
    return requestLocationPermission();
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
