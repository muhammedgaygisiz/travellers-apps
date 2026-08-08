import { inject, Injectable } from '@angular/core';
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

  /** Read guarded: `users.value()` throws once the read has failed (#1232). */
  usersValue = this.dataAccessService.usersValue;
  usersFailed = this.dataAccessService.usersFailed;
  type = this.dataAccessService.type;

  loggedInUserId = toSignal(this.storeService.userId$, { initialValue: '' });
  userIdFromUrl = this.storeService.userIdFromUrl;

  /** Runs a failed list read again. */
  retryLoad(): void {
    this.dataAccessService.users.reload();
  }

  userClicked(user: PublicUser): void {
    this.navController.navigateForward([PATH.PROFILE, user.userId]);
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
