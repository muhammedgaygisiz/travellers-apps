import { inject, Injectable } from '@angular/core';
import { ProfileDataAccessService } from 'bite-tribe/profile-data-access';
import { NavController } from '@ionic/angular/standalone';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  dataAccess = inject(ProfileDataAccessService);
  private readonly navController = inject(NavController);

  isAuthenticated = this.dataAccess.isAuthenticated;

  logout() {
    this.dataAccess.logout();
  }

  gotoSettings() {
    this.navController.navigateForward(['settings']);
  }

  gotoMyBucketlists() {
    this.navController.navigateForward(['my-bites']);
  }

  gotoMyBites() {
    this.navController.navigateForward(['my-bites']);
  }
}
