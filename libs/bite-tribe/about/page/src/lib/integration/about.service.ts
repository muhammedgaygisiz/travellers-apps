import { inject, Injectable } from '@angular/core';
import { AboutDataAccessService } from 'bite-tribe/about-data-access';
import { NavController } from '@ionic/angular';
import { PATH } from 'utils';

@Injectable({ providedIn: 'root' })
export class AboutService {
  dataAccess = inject(AboutDataAccessService);
  private readonly navController = inject(NavController);

  totalNumberBites = this.dataAccess.totalNumberBites;
  totalNumberUsers = this.dataAccess.totalNumberUsers;

  /** Read guarded: `value()` throws once a read has failed (#1232). */
  totalNumberBitesValue = this.dataAccess.totalNumberBitesValue;
  totalNumberUsersValue = this.dataAccess.totalNumberUsersValue;

  goToPrivacyPolicy(): void {
    void this.navController.navigateForward([PATH.PRIVACY_POLICY]);
  }
}
