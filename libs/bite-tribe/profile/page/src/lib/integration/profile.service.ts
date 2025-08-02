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

  logout() {
    this.dataAccess.logout();
  }

  gotoSettings() {
    this.navController.navigateForward(['settings']);
  }

  gotoMyBucketlists() {
    this.navController.navigateForward(['my-bucketlists']);
  }

  gotoMyBites() {
    this.navController.navigateForward(['my-bites']);
  }

  likeButtonClicked(likeClick: { likeType: string; biteId: string }) {
    this.dataAccess.submitLikeClick(likeClick);
  }

  biteClicked(bite: Bite) {
    this.navController.navigateForward(['bite', bite.id]);
  }

  restaurantClicked(bite: Bite) {
    if (bite.restaurantId) {
      // eslint-disable-next-line no-unused-vars
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
