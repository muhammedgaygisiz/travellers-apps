import { inject, Injectable } from '@angular/core';
import { MarketPlaceDataAccessService } from 'bite-tribe/market-place-data-access';
import { NavController } from '@ionic/angular/standalone';

@Injectable({ providedIn: 'root' })
export class MarketPlaceService {
  dataAccess = inject(MarketPlaceDataAccessService);
  private readonly navController = inject(NavController);

  biteTrails = this.dataAccess.biteTrails;

  onGoToProfileClick(ownerId: string): void {
    this.navController.navigateForward(['profile', ownerId]);
  }
}
