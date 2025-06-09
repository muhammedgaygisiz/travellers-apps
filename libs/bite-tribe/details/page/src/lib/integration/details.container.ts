import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DetailsPage } from '../components/details-page/details.page';
import { DetailsService } from './details.service';

@Component({
  template: `
    <details-page
      class="ion-page"
      [bite]="service.bite()"
      [reviews]="service.reviews()"
      [bucketlists]="service.bucketlists()"
      [userId]="service.userId()"
      (submitNewTags)="service.saveNewTags($event)"
      (submitNewReview)="service.saveReview($event)"
      (selectList)="service.addBiteToSelectedBucketList($event)"
      (removeBiteFromBucketlist)="service.removeBiteFromBucketlist($event)"
      (newList)="service.saveBiteToBucketListWithNewList($event)"
      (likeButtonClick)="service.likeButtonClicked($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DetailsPage],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class DetailsContainer {
  service = inject(DetailsService);
}
