import { inject, Injectable, resource, ResourceLoader } from '@angular/core';
import { ProfileApiService } from 'bite-tribe/api';
import type { PublicUser } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';

@Injectable({ providedIn: 'root' })
export class FollowersDataAccessService {
  private readonly profileApiService = inject(ProfileApiService);
  private readonly storeService = inject(BiteTribeStoreService);

  type = this.storeService.type;

  usersLoader: ResourceLoader<any, any> = ({ params }: any) => {
    const type = params.type;
    const userId = params.userId;

    if (!userId) {
      return Promise.resolve([]);
    }

    if (type === 'followers') {
      return this.profileApiService.fetchFollowersWithDetails(userId);
    } else if (type === 'following') {
      return this.profileApiService.fetchFollowingWithDetails(userId);
    }

    return Promise.resolve([]);
  };

  users = resource({
    params: () => ({
      userId: this.storeService.userIdFromUrl(),
      type: this.storeService.type(),
    }),
    loader: this.usersLoader.bind(this),
  });

  async unfollowUser(user: PublicUser): Promise<void> {
    return this.profileApiService.unfollowUser(user);
  }
}
