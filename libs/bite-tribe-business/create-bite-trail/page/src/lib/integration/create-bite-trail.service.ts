import { inject, Injectable } from '@angular/core';
import { CreateBiteTrailDataAccessService } from 'bite-tribe-business/create-bite-trail-data-access';
import { NavController } from '@ionic/angular/standalone';
import type { BiteTrail } from 'model';

@Injectable({ providedIn: 'root' })
export class CreateBiteTrailService {
  private readonly dataAccess = inject(CreateBiteTrailDataAccessService);
  private readonly navController = inject(NavController);

  selectedBites = this.dataAccess.selectedBites;
  employees = this.dataAccess.employees;
  organisation = this.dataAccess.organisation;

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
    await this.dataAccess.createBiteTrail(trailData);
    void this.navController.navigateBack([]);
  }
}
