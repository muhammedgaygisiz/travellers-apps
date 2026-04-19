import { effect, inject, Injectable, signal } from '@angular/core';
import {
  BiteTrailRating,
  BucketlistsDataAccessService,
} from 'bite-tribe/bucketlist-data-access';
import { NavController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root',
})
export class RateBucketlistService {
  private readonly dataAccess = inject(BucketlistsDataAccessService);
  private readonly navController = inject(NavController);

  selectedBucketlist = this.dataAccess.selectedBucketlist;
  existingRating = signal<BiteTrailRating | undefined>(undefined);
  isSubmitting = signal(false);

  readonly loadExistingRatingEffect = effect(() => {
    const biteTrailId = this.selectedBucketlist()?.biteTrailId;
    if (!biteTrailId) {
      this.existingRating.set(undefined);
      return;
    }

    void this.loadExistingRating(biteTrailId);
  });

  async submitRating(params: BiteTrailRating): Promise<void> {
    const biteTrailId = this.selectedBucketlist()?.biteTrailId;
    const existingRating = this.existingRating();

    if (!biteTrailId || existingRating) {
      return;
    }

    this.isSubmitting.set(true);
    try {
      const created = await this.dataAccess.createOwnBiteTrailRating({
        biteTrailId,
        rating: params.rating,
        review: params.review,
      });

      if (created) {
        this.existingRating.set(params);
        this.navController.back();
      } else {
        await this.loadExistingRating(biteTrailId);
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async loadExistingRating(biteTrailId: string): Promise<void> {
    const existingRating =
      await this.dataAccess.getOwnBiteTrailRating(biteTrailId);
    this.existingRating.set(existingRating);
  }
}
