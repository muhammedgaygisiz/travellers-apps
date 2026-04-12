import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
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
  IonText,
} from '@ionic/angular/standalone';
import type { Bite } from 'model';
import { BiteComponent } from 'bite-tribe-common/bite';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

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
    IonCard,
    IonCardContent,
    BiteComponent,
    TranslocoPipe,
  ],
})
export class BiteTrailBitesPage {
  transloco = inject(TranslocoService);

  bites = input<Bite[]>([]);
  title = input('');
  userId = input<string>();
  isFree = input<boolean>(false);
  savedBucketlistId = input<string | null>(null);

  readonly biteClick = output<Bite>();
  readonly restaurantClick = output<Bite>();
  readonly openMapView = output<void>();
  readonly getForFree = output<void>();
  readonly goToSavedBucketList = output<void>();

  toggleAddButtonText = computed(() => {
    const savedBucketlistId = this.savedBucketlistId();
    return savedBucketlistId
      ? this.transloco.translate('go-to-saved bucket-list')
      : this.transloco.translate('get-bitetrail-for-free');
  });
}
