import { inject, Injectable } from '@angular/core';
import { BucketlistsDataAccessService } from 'bite-tribe/bucketlist-data-access';
import { NavController } from '@ionic/angular/standalone';
import { RemoveBiteFromBucketlistParams } from 'model';

@Injectable({
  providedIn: 'root',
})
export class EditBucketlistsService {
  dataAccess = inject(BucketlistsDataAccessService);
  private readonly navController = inject(NavController);

  selectedBucketlist = this.dataAccess.selectedBucketlist;
  bites = this.dataAccess.bitesBySelectedBucketlist;

  saveTitle(name: string): void {
    const bucketlistId = this.selectedBucketlist()?.id;
    if (bucketlistId) {
      this.dataAccess.updateBucketlistName(bucketlistId, name);
    }
  }

  removeBiteFromBucketlist(params: RemoveBiteFromBucketlistParams): void {
    this.dataAccess.removeBiteFromBucketlist(params);
  }

  navigateBack(): void {
    this.navController.back();
  }
}
