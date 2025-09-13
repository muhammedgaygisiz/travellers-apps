import { inject, Injectable } from '@angular/core';
import { BucketlistsDataAccessService } from 'bite-tribe/bucketlist-data-access';
import { NavController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root',
})
export class BucketlistsService {
  dataAccess = inject(BucketlistsDataAccessService);
  private readonly navController = inject(NavController);

  bucketlists = this.dataAccess.bucketlists;

  gotoBucketlistDetails(bucketlistId: string): void {
    this.navController.navigateForward(['my-bucketlists', bucketlistId]);
  }

  createAndSaveToBucketList(bucketListName: string): void {
    this.dataAccess.createAndSaveToBucketList(bucketListName);
  }
}
