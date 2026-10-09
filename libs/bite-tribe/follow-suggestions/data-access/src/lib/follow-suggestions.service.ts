import { computed, inject, Injectable, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProfileApiService, SettingsApiService } from 'bite-tribe/api';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { getCurrentPosition, getLocationPermissionState } from 'geolocation';
import type {
  FollowSuggestion,
  FollowSuggestionSurface,
  Geopoint,
} from 'model';
import { lastValueFrom } from 'rxjs';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { ToastService } from 'toast';
import { resourceValue } from 'utils';

/** How long a dismissed home card stays away. */
export const FOLLOW_SUGGESTIONS_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * People to follow, shared by every surface that shows them
 * (GitHub issue #1708): the onboarding finish step, the empty Following list
 * and the home card.
 *
 * One root service rather than one per surface, so a person followed in
 * onboarding is already gone from the list on home, and the home card knows
 * the user now follows somebody without re-reading the profile.
 *
 * Nothing is fetched until a surface asks with {@link request}: home is opened
 * by every user, and most of them already follow people.
 */
@Injectable({ providedIn: 'root' })
export class FollowSuggestionsService {
  private readonly profileApi = inject(ProfileApiService);
  private readonly settingsApi = inject(SettingsApiService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly analytics = inject(AnalyticsService);
  private readonly toast = inject(ToastService);

  private readonly userId = toSignal(this.storeService.userId$);
  private readonly profile = toSignal(this.storeService.publicUser$);
  private readonly settings = toSignal(this.storeService.settings$);
  private readonly storedPosition = toSignal(this.storeService.position$);

  private readonly requested = signal(false);
  private readonly followedIds = signal<ReadonlySet<string>>(new Set());
  private readonly pending = signal<ReadonlySet<string>>(new Set());
  private readonly dismissedThisSession = signal<string | undefined>(undefined);

  private readonly suggestionsResource = resource({
    params: () => {
      const userId = this.userId();

      return this.requested() && userId ? { userId } : undefined;
    },
    loader: () => this.load(),
  });

  private readonly loaded = resourceValue(
    this.suggestionsResource,
    [] as FollowSuggestion[],
  );

  /** The people still worth showing: everybody not followed from here yet. */
  readonly suggestions = computed(() =>
    this.loaded().filter(({ userId }) => !this.followedIds().has(userId)),
  );

  readonly isLoading = this.suggestionsResource.isLoading;

  /** Ids whose follow is being written, so their button can say so. */
  readonly pendingIds = this.pending.asReadonly();

  /**
   * Whether the user follows anybody. The profile's `followingCount` is read
   * once at login, so a follow made from a suggestion is counted on top.
   */
  readonly followsAnyone = computed(
    () =>
      (this.profile()?.followingCount ?? 0) > 0 || this.followedIds().size > 0,
  );

  private readonly homeCardDismissed = computed(() => {
    const dismissedAt =
      this.dismissedThisSession() ??
      this.settings()?.followSuggestionsDismissedAt;

    return (
      !!dismissedAt &&
      Date.now() - new Date(dismissedAt).getTime() <
        FOLLOW_SUGGESTIONS_DISMISS_MS
    );
  });

  /**
   * Whether home should even ask; it is a question about the user, not the
   * list. Undecided until the profile has arrived, so somebody who follows
   * people never pays for a call in the moment before their count is known.
   */
  readonly homeCardWanted = computed(
    () =>
      !!this.profile() && !this.followsAnyone() && !this.homeCardDismissed(),
  );

  readonly homeCardVisible = computed(
    () => this.homeCardWanted() && this.suggestions().length > 0,
  );

  /** Loads the suggestions once; later calls reuse what was loaded. */
  request(): void {
    this.requested.set(true);
  }

  trackShown(surface: FollowSuggestionSurface, count: number): void {
    this.analytics.logEvent(AnalyticsEvent.FollowSuggestionsShown, {
      surface,
      count,
    });
  }

  /**
   * Follows one suggested person. Resolves whether or not the write worked: a
   * failure puts the button back and says so, and there is nothing else for
   * a caller to do about it.
   */
  async follow(
    suggestion: FollowSuggestion,
    surface: FollowSuggestionSurface,
  ): Promise<boolean> {
    const { userId } = suggestion;

    if (this.pending().has(userId) || this.followedIds().has(userId)) {
      return false;
    }

    const position =
      this.suggestions().findIndex((entry) => entry.userId === userId) + 1;

    this.pending.update((ids) => new Set(ids).add(userId));

    try {
      await this.profileApi.follow(userId);
    } catch {
      await this.toast.present({
        messageKey: 'follow-suggestions-follow-failed',
        outcome: 'failure',
      });

      return false;
    } finally {
      this.pending.update((ids) => {
        const next = new Set(ids);
        next.delete(userId);

        return next;
      });
    }

    this.followedIds.update((ids) => new Set(ids).add(userId));
    this.analytics.logEvent(AnalyticsEvent.FollowSuggestionFollowed, {
      surface,
      position,
      reason: suggestion.reason,
    });
    this.analytics.logEvent(AnalyticsEvent.UserFollowed, {
      source: 'suggestion',
    });

    return true;
  }

  /**
   * Hides the home card for a week, on this device at once and on every
   * other one through the account's settings. A failed write still hides it
   * for this session: the user said no, and the card coming straight back
   * would be the worse failure.
   */
  async dismissHomeCard(): Promise<void> {
    const followSuggestionsDismissedAt = new Date().toISOString();

    this.dismissedThisSession.set(followSuggestionsDismissedAt);

    try {
      await this.settingsApi.mergeSettings({ followSuggestionsDismissedAt });

      const settings = this.settings();

      if (settings) {
        this.storeService.notifySavedSettings({
          ...settings,
          followSuggestionsDismissedAt,
        });
      }
    } catch (error) {
      console.warn('Failed to save the follow-suggestions dismissal:', error);
    }
  }

  /**
   * Suggestions are an extra: a failed call shows nothing rather than an
   * error, because there is nothing the user could do about it.
   */
  private async load(): Promise<FollowSuggestion[]> {
    try {
      return await this.profileApi.fetchFollowSuggestions(
        await this.knownPosition(),
      );
    } catch (error) {
      console.warn('Failed to load follow suggestions:', error);

      return [];
    }
  }

  /**
   * A position this feature may use without asking for one: whatever the feed
   * already read, or a fresh read where the OS has already granted access.
   * The web build has no grant to check, and a read there would raise the
   * browser's prompt, so it only uses what the feed read.
   */
  private async knownPosition(): Promise<Geopoint | undefined> {
    const stored = this.storedPosition();

    if (stored) {
      return { latitude: stored.latitude, longitude: stored.longitude };
    }

    if ((await getLocationPermissionState()) !== 'granted') {
      return undefined;
    }

    try {
      const { coords } = await lastValueFrom(getCurrentPosition());

      return { latitude: coords.latitude, longitude: coords.longitude };
    } catch {
      return undefined;
    }
  }
}
