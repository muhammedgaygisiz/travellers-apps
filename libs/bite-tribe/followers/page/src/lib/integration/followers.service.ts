import { inject, Injectable, signal } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import { ProfileApiService } from 'bite-tribe/api';
import type { PublicUser } from 'model';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from 'ta-firestore';

@Injectable({ providedIn: 'root' })
export class FollowersService {
  private readonly navController = inject(NavController);
  private readonly profileApiService = inject(ProfileApiService);
  private readonly authService = inject(AuthService);

  users = signal<PublicUser[]>([]);
  isLoading = signal<boolean>(false);
  type = signal<'followers' | 'following'>('followers');

  currentUserId = toSignal(this.authService.userId$, { initialValue: '' });

  async loadFollowers(userId: string): Promise<void> {
    this.isLoading.set(true);
    this.type.set('followers');
    try {
      const followers =
        await this.profileApiService.fetchFollowersWithDetails(userId);
      this.users.set(followers);
    } catch (error) {
      console.error('Error loading followers:', error);
      this.users.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadFollowing(userId: string): Promise<void> {
    this.isLoading.set(true);
    this.type.set('following');
    try {
      const following =
        await this.profileApiService.fetchFollowingWithDetails(userId);
      this.users.set(following);
    } catch (error) {
      console.error('Error loading following:', error);
      this.users.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  userClicked(user: PublicUser): void {
    this.navController.navigateForward(['profile', user.userId]);
  }

  async unfollowClicked(user: PublicUser): Promise<void> {
    try {
      await this.profileApiService.unfollowUser(user);
      // Reload the list after unfollowing
      const currentUserId = this.currentUserId();
      if (currentUserId) {
        await this.loadFollowing(currentUserId);
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  }
}
