import { inject, Injectable, signal } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import { FollowersDataAccessService } from 'bite-tribe/followers-data-access';
import type { PublicUser } from 'model';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { PATH } from 'utils';

@Injectable({ providedIn: 'root' })
export class FollowersService {
  private readonly navController = inject(NavController);
  private readonly dataAccessService = inject(FollowersDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);

  users = this.dataAccessService.users;
  type = this.dataAccessService.type;
  isLoading = this.dataAccessService.isLoading;

  currentUserId = toSignal(this.storeService.userId$, { initialValue: '' });

  // async loadFollowers(userId: string): Promise<void> {
  //   this.isLoading.set(true);
  //   this.type.set('followers');
  //   try {
  //     const followers =
  //       await this.dataAccessService.fetchFollowersWithDetails(userId);
  //     this.users.set(followers);
  //   } catch (error) {
  //     console.error('Error loading followers:', error);
  //     this.users.set([]);
  //   } finally {
  //     this.isLoading.set(false);
  //   }
  // }

  // async loadFollowing(userId: string): Promise<void> {
  //   this.isLoading.set(true);
  //   this.type.set('following');
  //   try {
  //     const following =
  //       await this.dataAccessService.fetchFollowingWithDetails(userId);
  //     this.users.set(following);
  //   } catch (error) {
  //     console.error('Error loading following:', error);
  //     this.users.set([]);
  //   } finally {
  //     this.isLoading.set(false);
  //   }
  // }

  userClicked(user: PublicUser): void {
    this.navController.navigateForward([PATH.PROFILE, user.userId]);
  }

  async unfollowClicked(user: PublicUser): Promise<void> {
    try {
      await this.dataAccessService.unfollowUser(user);
      // Reload the list after unfollowing
      const currentUserId = this.currentUserId();
      if (currentUserId) {
        // await this.loadFollowing(currentUserId);
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  }
}
