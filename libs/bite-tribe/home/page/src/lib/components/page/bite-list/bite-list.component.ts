import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
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
    NgTemplateOutlet,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonItemOption,
    IonItemOptions,
    IonItemSliding,
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
  /**
   * Turns each Bite into a sliding item that can be swiped to toggle its
   * tried-out status. Only the bucket list detail view owns that status, so the
   * rest of the feeds keep plain cards.
   */
  enableTriedOutSwipe = input(false);
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

  /**
   * Toggles the tried-out status, whether the user completed the swipe or
   * tapped the revealed option. The item is closed afterwards so the card
   * springs back and shows its new state.
   */
  onTriedOutAction(
    biteId: string,
    triedOut: boolean,
    slidingItem: IonItemSliding,
  ): void {
    this.triedOutChange.emit({ biteId, checked: !triedOut });
    void slidingItem.close();
  }

  onIonInfinite(event: InfiniteScrollCustomEvent): void {
    this.loadMore.emit();
    event.target.complete();
  }
}
