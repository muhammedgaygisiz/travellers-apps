import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonText,
} from '@ionic/angular/standalone';
import type { Bite, Like } from 'model';
import { BiteComponent } from 'bite-tribe-common/bite';

@Component({
  selector: 'bite-trail-bites-page',
  templateUrl: 'bite-trail-bites.page.html',
  styleUrl: 'bite-trail-bites.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonChip,
    IonIcon,
    IonText,
    IonSelect,
    IonSelectOption,
    IonCard,
    IonCardContent,
    BiteComponent,
  ],
})
export class BiteTrailBitesPage {
  bites = input<Bite[]>([]);
  title = input('');
  sorting = input<string>('distance');
  userId = input<string>();

  readonly biteClick = output<Bite>();
  readonly restaurantClick = output<Bite>();
  readonly likeButtonClick = output<Like>();
  readonly sortingChange = output<string>();
  readonly openMapView = output<void>();

  sortingLabel = computed(() => {
    const sorting = this.sorting();

    switch (sorting) {
      case 'distance':
        return 'Distance';
      case 'likes':
        return 'Likes';
      case 'createdAt':
        return 'Date';
      case 'price':
        return 'Price';
      case 'rating':
        return 'Rating';
      default:
        return 'Distance';
    }
  });

  emitSortingChange(event: { detail: { value: string } }): void {
    if (event.detail) {
      this.sortingChange.emit(event.detail.value);
    }
  }
}
