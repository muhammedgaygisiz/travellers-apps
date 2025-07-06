import { inject, Injectable } from '@angular/core';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { NavController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class BiteService {
  private readonly dataAccess = inject(BiteDataAccessService);
  private readonly navController = inject(NavController);

  bite = this.dataAccess.bite;
  currency = this.dataAccess.currency;
  position = this.dataAccess.position;
  cachedBite = this.dataAccess.cachedBite;
  editingBite = this.dataAccess.editingBite;

  submitNewBite(newBite: any) {
    // eslint-disable-next-line no-unused-vars
    const { id, ...biteData } = newBite;

    this.dataAccess.submitNewBite(biteData);

    this.navController.navigateBack(['home']);
  }

  submitEditedBite(editedBite: any) {
    this.dataAccess.submitEditedBite(editedBite);

    this.navController.navigateBack(['my-bites']);
  }

  setEditedImage(image: string) {
    this.dataAccess.setEditedImage(image);
  }
}
