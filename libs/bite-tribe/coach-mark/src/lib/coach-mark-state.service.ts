import { inject, Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { AuthService } from 'ta-firestore';
import type { CoachMarkSurface } from './coach-mark-surface';

const SEEN_KEY_PREFIX = 'coach-marks-seen:';

/**
 * Tracks which feature coach marks the current user has already dismissed.
 *
 * The seen set lives in device {@link Preferences}, keyed per user id, and is
 * deliberately kept apart from the onboarding completion flag on the user
 * document: dismissing a coach mark says nothing about whether the assistant was
 * finished, and finishing the assistant does not pre-dismiss any mark (epic
 * #850, issue #1016).
 */
@Injectable({ providedIn: 'root' })
export class CoachMarkStateService {
  private readonly authService = inject(AuthService);

  async hasSeen(surface: CoachMarkSurface): Promise<boolean> {
    const seen = await this.loadSeen();
    return seen.includes(surface);
  }

  async markSeen(surface: CoachMarkSurface): Promise<void> {
    const key = this.storageKey();
    if (!key) {
      return;
    }

    const seen = await this.loadSeen();
    if (seen.includes(surface)) {
      return;
    }

    try {
      await Preferences.set({
        key,
        value: JSON.stringify([...seen, surface]),
      });
    } catch (error) {
      console.warn('Failed to persist coach mark seen state:', error);
    }
  }

  private async loadSeen(): Promise<CoachMarkSurface[]> {
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
      return Array.isArray(parsed) ? (parsed as CoachMarkSurface[]) : [];
    } catch (error) {
      console.warn('Failed to read coach mark seen state:', error);
      return [];
    }
  }

  private storageKey(): string | null {
    const uid = this.authService.getUser()?.uid;
    return uid ? `${SEEN_KEY_PREFIX}${uid}` : null;
  }
}
