import { inject, Injectable, resource } from '@angular/core';
import { ProfileApiService } from 'bite-tribe/api';
import type { PublicUser } from 'model';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeStoreService } from 'bite-tribe/store';

@Injectable({ providedIn: 'root' })
export class FollowersDataAccessService {
  private readonly profileApiService = inject(ProfileApiService);
  private readonly storeService = inject(BiteTribeStoreService);

  users = resource({
    params: () => ({
      userId: this.storeService.userIdFromUrl(),
      type: this.storeService.type(),
    }),
    loader: ({ params }) => {
      const type = params.type;
      const userId = params.userId;

      if (type === 'followers') {
        return this.profileApiService.fetchFollowersWithDetails(userId);
      } else {
        return this.profileApiService.fetchFollowingWithDetails(userId);
      }
    },
  });

  type = toSignal(this.storeService.type$);

  async fetchFollowersWithDetails(userId: string): Promise<PublicUser[]> {
    return this.profileApiService.fetchFollowersWithDetails(userId);
  }

  async fetchFollowingWithDetails(userId: string): Promise<PublicUser[]> {
    return this.profileApiService.fetchFollowingWithDetails(userId);
  }

  async unfollowUser(user: PublicUser): Promise<void> {
    return this.profileApiService.unfollowUser(user);
  }
}
