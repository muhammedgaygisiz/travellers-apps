import { inject, Injectable, resource, ResourceLoader } from '@angular/core';
import { ProfileApiService } from 'bite-tribe/api';
import type { PublicUser } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { resourceFailed, resourceValue } from 'utils';

@Injectable({ providedIn: 'root' })
export class FollowersDataAccessService {
  private readonly profileApiService = inject(ProfileApiService);
  private readonly storeService = inject(BiteTribeStoreService);

  type = this.storeService.type;

  usersLoader: ResourceLoader<
    PublicUser[],
    { userId: string | undefined; type: string | undefined }
  > = ({ params }) => {
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

  /**
   * The list, or nothing. `value()` throws once the read has failed, and read
   * from the template that took the whole list page down with it rather than
   * reporting anything. See GitHub issue #1232.
   */
  usersValue = resourceValue(this.users, [] as PublicUser[]);

  /** True once the read failed, so the list can say so instead of looking empty. */
  usersFailed = resourceFailed(this.users);

  async unfollowUser(user: PublicUser): Promise<void> {
    return this.profileApiService.unfollowUser(user);
  }
}
