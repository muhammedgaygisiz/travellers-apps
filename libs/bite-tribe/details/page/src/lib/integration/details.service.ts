import { inject, Injectable } from '@angular/core';
import { DetailsDataAccessService } from 'bite-tribe/details-data-access';

@Injectable({ providedIn: 'root' })
export class DetailsService {
  dataAccess = inject(DetailsDataAccessService);

  bite = this.dataAccess.bite;
  reviews = this.dataAccess.reviews;
  currentPosition = this.dataAccess.currentPosition();

  saveNewTags(newTags: string) {
    this.dataAccess.saveNewTags(newTags);
  }

  saveReview(newReview: { review: string; biteId: string }) {
    this.dataAccess.saveNewReview(newReview);
  }
}
