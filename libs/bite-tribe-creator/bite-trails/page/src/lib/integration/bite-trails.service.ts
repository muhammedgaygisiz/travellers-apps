import { inject, Injectable } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import { BiteTrailsDataAccessService } from 'bite-tribe-creator/bite-trails-data-access';

@Injectable({ providedIn: 'root' })
export class BiteTrailsService {
  private readonly dataAccess = inject(BiteTrailsDataAccessService);
  private readonly navController = inject(NavController);

  biteTrailsValue = this.dataAccess.biteTrailsValue;
  isAuthenticated = this.dataAccess.isAuthenticated;

  /**
   * Reads the trails again. Coming back from the create page has to show the
   * trail just made, and a photo the image check has decided on since.
   */
  refresh(): void {
    this.dataAccess.biteTrails.reload();
  }

  createBiteTrailClicked(): void {
    void this.navController.navigateForward(['create-bite-trail']);
  }

  logout(): void {
    this.dataAccess.logout();
  }
}
