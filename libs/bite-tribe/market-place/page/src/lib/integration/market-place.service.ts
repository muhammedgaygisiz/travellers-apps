import { inject, Injectable } from '@angular/core';
import { MarketPlaceDataAccessService } from 'bite-tribe/market-place-data-access';
import { NavController } from '@ionic/angular/standalone';
import type { BiteTrail } from 'model';
import { PATH } from 'utils';

@Injectable({ providedIn: 'root' })
export class MarketPlaceService {
  dataAccess = inject(MarketPlaceDataAccessService);
  private readonly navController = inject(NavController);

  biteTrails = this.dataAccess.biteTrails;

  /** Read guarded: `value()` throws once the read has failed (#1232). */
  biteTrailsValue = this.dataAccess.biteTrailsValue;

  onGoToProfileClick(ownerId: string): void {
    this.navController.navigateForward(['profile', ownerId]);
  }

  onViewBiteTrail(biteTrail: BiteTrail): void {
    this.navController.navigateForward([PATH.BITE_TRAIL, biteTrail.id]);
  }
}
