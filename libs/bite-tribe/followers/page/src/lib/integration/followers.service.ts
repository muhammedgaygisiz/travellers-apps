import { computed, effect, inject, Injectable } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import { FollowersDataAccessService } from 'bite-tribe/followers-data-access';
import type { FollowSuggestion, PublicUser } from 'model';
import { FollowSuggestionsService } from 'bite-tribe/follow-suggestions-data-access';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { PATH } from 'utils';

@Injectable({ providedIn: 'root' })
export class FollowersService {
  private readonly navController = inject(NavController);
  private readonly dataAccessService = inject(FollowersDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly followSuggestions = inject(FollowSuggestionsService);

  users = this.dataAccessService.users;

  /** Read guarded: `users.value()` throws once the read has failed (#1232). */
  usersValue = this.dataAccessService.usersValue;
  usersFailed = this.dataAccessService.usersFailed;
  type = this.dataAccessService.type;

  loggedInUserId = toSignal(this.storeService.userId$, { initialValue: '' });
  userIdFromUrl = this.storeService.userIdFromUrl;

  suggestions = this.followSuggestions.suggestions;
  suggestionsPending = this.followSuggestions.pendingIds;
  suggestionsLoading = this.followSuggestions.isLoading;

  /** The user's own Following list, read and empty (issue #1708). */
  private readonly ownFollowingIsEmpty = computed(
    () =>
      this.type() === 'following' &&
      !!this.loggedInUserId() &&
      this.userIdFromUrl() === this.loggedInUserId() &&
      !this.users.isLoading() &&
      !this.usersFailed() &&
      this.usersValue().length === 0,
  );

  constructor() {
    effect(() => {
      if (this.ownFollowingIsEmpty()) {
        this.followSuggestions.request();
      }
    });
  }

  /** Runs a failed list read again. */
  retryLoad(): void {
    this.dataAccessService.users.reload();
  }

  userClicked(user: PublicUser): void {
    this.navController.navigateForward([PATH.PROFILE, user.userId]);
  }

  suggestionClicked(userId: string): void {
    this.navController.navigateForward([PATH.PROFILE, userId]);
  }

  /** A follow from the empty list puts that person into it. */
  async followSuggestion(suggestion: FollowSuggestion): Promise<void> {
    if (await this.followSuggestions.follow(suggestion, 'following_empty')) {
      this.dataAccessService.users.reload();
    }
  }

  trackSuggestionsShown(count: number): void {
    this.followSuggestions.trackShown('following_empty', count);
  }

  async unfollowClicked(user: PublicUser): Promise<void> {
    try {
      await this.dataAccessService.unfollowUser(user);

      const loggedInUserId = this.loggedInUserId();
      if (loggedInUserId) {
        this.dataAccessService.users.reload();
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  }
}
