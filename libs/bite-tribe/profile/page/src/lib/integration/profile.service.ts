import { computed, inject, Injectable } from '@angular/core';
import { ProfileDataAccessService } from 'bite-tribe/profile-data-access';
import { NavController } from '@ionic/angular/standalone';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  dataAccess = inject(ProfileDataAccessService);
  private readonly navController = inject(NavController);

  isAuthenticated = this.dataAccess.isAuthenticated;
  biteCreator = this.dataAccess.biteCreator;
  userId = this.dataAccess.userId;
  bitesByUser = computed(() => {
    const bites = this.dataAccess.bites();
    const userId = this.dataAccess.biteCreator()?.userId;

    return bites.filter((bite) => bite.userId === userId);
  });

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
}
