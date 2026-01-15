import { inject, Injectable } from '@angular/core';
import { ProfileDataAccessService } from 'bite-tribe/profile-data-access';
import { NavController } from '@ionic/angular/standalone';
import { Bite, PublicUser } from 'model';
import { PATH } from 'utils';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  dataAccess = inject(ProfileDataAccessService);
  private readonly navController = inject(NavController);

  isAuthenticated = this.dataAccess.isAuthenticated;
  myUser = this.dataAccess.myUser;
  biteCreator = this.dataAccess.biteCreator;
  userId = this.dataAccess.userId;
  bitesByUser = this.dataAccess.bitesByUser;
  myBites = this.dataAccess.myBites;
  isPublicProfile = this.dataAccess.isPublicProfile;

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

  gotoEditProfile(): void {
    this.navController.navigateForward([PATH.EDIT_PROFILE]);
  }

  gotoMyProfileClicked(): void {
    this.navController.navigateForward(['my-profile']);
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

  goPublic(): void {
    this.dataAccess.goPublic();
  }

  goPrivate(): void {
    this.dataAccess.goPrivate();
  }

  saveProfile(publicUser: PublicUser): void {
    this.dataAccess.savePublicProfile(publicUser);
  }
}
