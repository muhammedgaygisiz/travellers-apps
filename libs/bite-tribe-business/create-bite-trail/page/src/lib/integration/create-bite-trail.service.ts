import { inject, Injectable } from '@angular/core';
import { CreateBiteTrailDataAccessService } from 'bite-tribe-business/create-bite-trail-data-access';
import { NavController } from '@ionic/angular/standalone';
import type { BiteTrail } from 'model';
import { ToastService } from 'toast';

@Injectable({ providedIn: 'root' })
export class CreateBiteTrailService {
  private readonly dataAccess = inject(CreateBiteTrailDataAccessService);
  private readonly navController = inject(NavController);
  private readonly toast = inject(ToastService);

  bites = this.dataAccess.bites;
  owner = this.dataAccess.owner;

  /** Read guarded: `value()` throws once the read has failed (#1232). */
  bitesValue = this.dataAccess.bitesValue;
  ownerValue = this.dataAccess.ownerValue;

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
      await this.toast.present({
        messageKey: 'bite-trail-created',
        outcome: 'success',
      });
      void this.navController.navigateBack([]);
    } catch {
      await this.toast.present({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });
    }
  }
}
