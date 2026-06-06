import { Location } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { LoadingController, NavController } from '@ionic/angular';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({ providedIn: 'root' })
export class BiteService {
  public readonly dataAccess = inject(BiteDataAccessService);
  private readonly navController = inject(NavController);
  private readonly location = inject(Location);
  private readonly loadingController = inject(LoadingController);
  private readonly transloco = inject(TranslocoService);

  image = signal<string>('');

  bite = this.dataAccess.bite;
  currency = this.dataAccess.currency;
  favCurrencies = this.dataAccess.favCurrencies;
  position = this.dataAccess.position;
  cachedBite = this.dataAccess.cachedBite;
  nearbyRestaurants = this.dataAccess.nearbyRestaurants;
  tagSuggestionsForEditingBite = this.dataAccess.tagSuggestionsForEditingBite;
  networkStatus = this.dataAccess.networkStatus;

  async submitNewBite(newBite: any): Promise<void> {
    const loading = await this.loadingController.create({
      message: this.transloco.translate('creating-bite'),
      backdropDismiss: false,
      cssClass: 'bite-creating-loading',
    });
    await loading.present();

    const { id, ...biteData } = newBite;
    try {
      await this.dataAccess.submitNewBite(biteData);
    } finally {
      await loading.dismiss();
    }

    void this.navController.navigateBack(['home']);
  }

  submitEditedBite(editedBite: any): void {
    void this.dataAccess.submitEditedBite(editedBite);
    this.location.back();
  }

  setEditingBite(bite: Partial<any>): void {
    this.dataAccess.setEditingBite(bite);
  }
}
