import { inject, Injectable } from '@angular/core';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { NavController } from '@ionic/angular';

type Bite = Partial<{
  image: string | null;
  name: string | null;
  price: number | null;
}>;

@Injectable({ providedIn: 'root' })
export class BiteService {
  private readonly dataAccess = inject(BiteDataAccessService);
  private readonly navController = inject(NavController);

  currency = this.dataAccess.currency;

  submitNewBite(newBite: Bite) {
    this.dataAccess.submitNewBite(newBite);

    this.navController.navigateBack(['home']);
  }
}
