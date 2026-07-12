import { inject, Injectable } from '@angular/core';
import { BucketlistsDataAccessService } from 'bite-tribe/bucketlist-data-access';
import { NavController } from '@ionic/angular/standalone';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';

@Injectable({
  providedIn: 'root',
})
export class BucketlistsService {
  dataAccess = inject(BucketlistsDataAccessService);
  private readonly navController = inject(NavController);
  private readonly analytics = inject(AnalyticsService);

  bucketlists = this.dataAccess.bucketlists;
  sorting = this.dataAccess.sorting;

  gotoBucketlistDetails(bucketlistId: string): void {
    this.navController.navigateForward(['my-bucketlists', bucketlistId]);
  }

  gotoEditBucketlist(bucketlistId: string): void {
    this.navController.navigateForward([
      'my-bucketlists',
      bucketlistId,
      'edit',
    ]);
  }

  gotoRateBucketlist(bucketlistId: string): void {
    this.navController.navigateForward([
      'my-bucketlists',
      bucketlistId,
      'rate',
    ]);
  }

  createAndSaveToBucketList(bucketListName: string): void {
    this.dataAccess.createAndSaveToBucketList(bucketListName);
    this.analytics.logEvent(AnalyticsEvent.BucketListCreated);
  }

  deleteBucketlist(bucketlistId: string): void {
    this.dataAccess.deleteBucketlist(bucketlistId);
  }

  sortingChange(value: string): void {
    this.dataAccess.setBucketlistSorting(value);
  }
}
