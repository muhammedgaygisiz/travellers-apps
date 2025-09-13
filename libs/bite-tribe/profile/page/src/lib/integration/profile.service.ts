import { inject, Injectable } from '@angular/core';
import { ProfileDataAccessService } from 'bite-tribe/profile-data-access';
import { NavController } from '@ionic/angular/standalone';
import { Bite } from 'model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  dataAccess = inject(ProfileDataAccessService);
  private readonly navController = inject(NavController);

  isAuthenticated = this.dataAccess.isAuthenticated;
  biteCreator = this.dataAccess.biteCreator;
  userId = this.dataAccess.userId;
  bitesByUser = this.dataAccess.bitesByUser;

  logout(): void {
    this.dataAccess.logout();
  }

  gotoSettings(): void {
    this.navController.navigateForward(['settings']);
  }

  gotoMyBucketlists(): void {
    this.navController.navigateForward(['my-bucketlists']);
  }

  gotoMyBites(): void {
    this.navController.navigateForward(['my-bites']);
  }

  likeButtonClicked(likeClick: { likeType: string; biteId: string }): void {
    this.dataAccess.submitLikeClick(likeClick);
  }

  biteClicked(bite: Bite): void {
    this.navController.navigateForward(['bite', bite.id]);
  }

  restaurantClicked(bite: Bite): void {
    if (bite.restaurantId) {
      const [empty, collectionName, restaurantId] =
        bite.restaurantId.split('/');

      this.navController.navigateForward([
        'bite',
        bite.id,
        'restaurant',
        restaurantId,
      ]);

      return;
    }

    this.navController.navigateForward([
      'bite',
      bite.id,
      'restaurant',
      encodeURIComponent(bite.place),
    ]);
  }
}
