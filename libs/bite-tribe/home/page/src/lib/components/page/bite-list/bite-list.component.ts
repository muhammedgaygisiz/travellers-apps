import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  IonCheckbox,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonText,
} from '@ionic/angular/standalone';
import { InfiniteScrollCustomEvent } from '@ionic/angular';
import type { Bite, LikeClick } from 'model';
import {
  BiteComponent,
  BiteSkeletonListComponent,
} from 'bite-tribe-common/bite';
import { TranslocoPipe } from '@jsverse/transloco';
import { IsBiteTriedOutPipe } from './is-bite-tried-out.pipe';

@Component({
  selector: 'bt-bite-list',
  templateUrl: 'bite-list.component.html',
  styleUrl: 'bite-list.component.scss',
  imports: [
    BiteComponent,
    BiteSkeletonListComponent,
    IonCheckbox,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonText,
    TranslocoPipe,
    IsBiteTriedOutPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteListComponent {
  bites = input<Bite[]>([]);
  userId = input<string>();
  editableBites = input(false);
  hasErrorLoadingGpsPosition = input(false);
  showTriedOutCheckbox = input(false);
  triedOutBiteIds = input<string[]>([]);
  hasMore = input(false);
  showSkeleton = input(false);

  readonly biteClick = output<Bite>();
  readonly likeButtonClick = output<LikeClick>();
  readonly gotoEdit = output<Bite>();
  readonly deleteBite = output<Bite>();
  readonly rateNowClick = output<{ bite: Bite; rating: number }>();
  readonly triedOutChange = output<{ biteId: string; checked: boolean }>();
  readonly loadMore = output<void>();

  onTriedOutChange(
    event: { detail: { checked: boolean } },
    biteId: string,
  ): void {
    this.triedOutChange.emit({ biteId, checked: event.detail.checked });
  }

  onIonInfinite(event: InfiniteScrollCustomEvent): void {
    this.loadMore.emit();
    event.target.complete();
  }
}
