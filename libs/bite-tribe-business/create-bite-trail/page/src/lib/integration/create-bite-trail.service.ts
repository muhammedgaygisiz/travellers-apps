import { inject, Injectable } from '@angular/core';
import { CreateBiteTrailDataAccessService } from 'bite-tribe-business/create-bite-trail-data-access';
import { NavController, ToastController } from '@ionic/angular/standalone';
import type { BiteTrail } from 'model';

@Injectable({ providedIn: 'root' })
export class CreateBiteTrailService {
  private readonly dataAccess = inject(CreateBiteTrailDataAccessService);
  private readonly navController = inject(NavController);
  private readonly toastController = inject(ToastController);

  selectedBites = this.dataAccess.selectedBites;
  employees = this.dataAccess.employees;
  organisation = this.dataAccess.organisation;

  /** Read guarded: `value()` throws once the read has failed (#1232). */
  organisationValue = this.dataAccess.organisationValue;

  async submitBiteTrail(
    trailData: Omit<
      BiteTrail,
      | 'id'
      | 'createdAt'
      | 'createdAtTimestamp'
      | 'updatedAt'
      | 'updatedAtTimestamp'
    >,
  ): Promise<void> {
    try {
      await this.dataAccess.createBiteTrail(trailData);
      await this.showToast('Bite trail created successfully.', 'success');
      void this.navController.navigateBack([]);
    } catch {
      await this.showToast('Something went wrong. Please try again.', 'danger');
    }
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger',
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}
