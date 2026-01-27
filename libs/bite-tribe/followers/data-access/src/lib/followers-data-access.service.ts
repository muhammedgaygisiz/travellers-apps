import { inject, Injectable } from '@angular/core';
import { ProfileApiService } from 'bite-tribe/api';
import type { PublicUser } from 'model';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeStoreService } from 'bite-tribe/store';

@Injectable({ providedIn: 'root' })
export class FollowersDataAccessService {
  private readonly profileApiService = inject(ProfileApiService);
  private readonly storeService = inject(BiteTribeStoreService);

  users = toSignal(this.storeService.users$, {
    initialValue: [] as PublicUser[],
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
