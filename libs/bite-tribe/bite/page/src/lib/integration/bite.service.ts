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

  submitNewBite(newBite: any) {
    this.dataAccess.submitNewBite(newBite);

    this.navController.navigateBack(['home']);
  }

  submitEditedBite(editedBite: any) {
    this.dataAccess.submitEditedBite(editedBite);

    this.navController.navigateBack(['my-bites']);
  }
}
