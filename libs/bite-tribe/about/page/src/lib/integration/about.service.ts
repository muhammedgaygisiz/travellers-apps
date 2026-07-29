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

  goToPrivacyPolicy(): void {
    void this.navController.navigateForward([PATH.PRIVACY_POLICY]);
  }
}
