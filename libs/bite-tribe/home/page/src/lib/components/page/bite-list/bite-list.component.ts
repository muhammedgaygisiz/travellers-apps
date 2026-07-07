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
import type { Bite, Like } from 'model';
import { BiteComponent } from 'bite-tribe-common/bite';
import { TranslocoPipe } from '@jsverse/transloco';
import { IsBiteTriedOutPipe } from './is-bite-tried-out.pipe';

@Component({
  selector: 'bt-bite-list',
  templateUrl: 'bite-list.component.html',
  styleUrl: 'bite-list.component.scss',
  imports: [
    BiteComponent,
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

  readonly biteClick = output<Bite>();
  readonly likeButtonClick = output<Like>();
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
