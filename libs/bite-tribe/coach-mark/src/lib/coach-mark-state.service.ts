import { inject, Injectable } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Preferences } from '@capacitor/preferences';
import type { PublicUser } from 'model';
import { AnalyticsEvent, AnalyticsService, AuthService } from 'ta-firestore';
import type { CoachMarkSurface } from './coach-mark-surface';

const SEEN_KEY_PREFIX = 'coach-marks-seen:';
const USERS_COLLECTION = 'users';

/**
 * Tracks which feature coach marks the current user has already dismissed.
 *
 * The seen set belongs to the account: it is kept on the user document as
 * `coachMarksSeen`, so a reinstall or a new phone does not show a returning
 * member the marks again (issue #1851). Device {@link Preferences}, keyed per
 * user id, is kept as well. It answers when the account cannot be read, and it
 * carries the marks dismissed before the account held them: the seen set is
 * the union of both, and every dismissal writes that union to both.
 *
 * It is deliberately kept apart from the onboarding completion flag on the same
 * document: dismissing a coach mark says nothing about whether the assistant was
 * finished, and finishing the assistant does not pre-dismiss any mark (epic
 * #850, issue #1016).
 */
@Injectable({ providedIn: 'root' })
export class CoachMarkStateService {
  private readonly authService = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);

  /**
   * One account read per user and app session. Every coach mark asks on first
   * render, and a dismissal keeps this in step with what it wrote.
   */
  private readonly accountSeen = new Map<string, Promise<CoachMarkSurface[]>>();

  async hasSeen(surface: CoachMarkSurface): Promise<boolean> {
    const uid = this.uid();
    if (!uid) {
      return false;
    }

    const seen = await this.loadSeen(uid);
    return seen.includes(surface);
  }

  async markSeen(surface: CoachMarkSurface): Promise<void> {
    const uid = this.uid();
    if (!uid) {
      return;
    }

    const seen = await this.loadSeen(uid);
    if (seen.includes(surface)) {
      return;
    }

    // A genuine first-time dismissal for this user; log it before persisting so
    // a storage failure below still records the funnel signal.
    this.analytics.logEvent(AnalyticsEvent.CoachMarkDismissed, { surface });

    const next = [...seen, surface];
    this.accountSeen.set(uid, Promise.resolve(next));

    await Promise.all([
      this.saveToDevice(uid, next),
      this.saveToAccount(uid, next),
    ]);
  }

  private async loadSeen(uid: string): Promise<CoachMarkSurface[]> {
    const [device, account] = await Promise.all([
      this.loadFromDevice(uid),
      this.loadFromAccountOnce(uid),
    ]);

    return [...new Set([...account, ...device])];
  }

  private async loadFromDevice(uid: string): Promise<CoachMarkSurface[]> {
    try {
      const { value } = await Preferences.get({ key: this.storageKey(uid) });
      if (!value) {
        return [];
      }

      return this.toSurfaces(JSON.parse(value));
    } catch (error) {
      console.warn('Failed to read coach mark seen state:', error);
      return [];
    }
  }

  private loadFromAccountOnce(uid: string): Promise<CoachMarkSurface[]> {
    let seen = this.accountSeen.get(uid);
    if (!seen) {
      seen = this.loadFromAccount(uid);
      this.accountSeen.set(uid, seen);
    }

    return seen;
  }

  private async loadFromAccount(uid: string): Promise<CoachMarkSurface[]> {
    try {
      const { snapshot } = await FirebaseFirestore.getDocument<PublicUser>({
        reference: `${USERS_COLLECTION}/${uid}`,
      });

      return this.toSurfaces(snapshot?.data?.coachMarksSeen);
    } catch (error) {
      // Not cached as empty: the next coach mark tries the account again.
      this.accountSeen.delete(uid);
      console.warn('Failed to read coach mark seen state from account:', error);
      return [];
    }
  }

  private async saveToDevice(
    uid: string,
    seen: CoachMarkSurface[],
  ): Promise<void> {
    try {
      await Preferences.set({
        key: this.storageKey(uid),
        value: JSON.stringify(seen),
      });
    } catch (error) {
      console.warn('Failed to persist coach mark seen state:', error);
    }
  }

  private async saveToAccount(
    uid: string,
    seen: CoachMarkSurface[],
  ): Promise<void> {
    try {
      await FirebaseFirestore.updateDocument({
        reference: `${USERS_COLLECTION}/${uid}`,
        data: { coachMarksSeen: seen },
      });
    } catch (error) {
      console.warn(
        'Failed to persist coach mark seen state to account:',
        error,
      );
    }
  }

  private toSurfaces(value: unknown): CoachMarkSurface[] {
    return Array.isArray(value) ? (value as CoachMarkSurface[]) : [];
  }

  private storageKey(uid: string): string {
    return `${SEEN_KEY_PREFIX}${uid}`;
  }

  private uid(): string | null {
    return this.authService.getUser()?.uid ?? null;
  }
}
