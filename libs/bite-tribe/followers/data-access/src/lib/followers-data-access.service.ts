import { inject, Injectable } from '@angular/core';
import { ProfileApiService } from 'bite-tribe/api';
import type { PublicUser } from 'model';

@Injectable({ providedIn: 'root' })
export class FollowersDataAccessService {
  private readonly profileApiService = inject(ProfileApiService);

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
