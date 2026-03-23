import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonIcon,
  IonText,
} from '@ionic/angular/standalone';
import type { Bite } from 'model';
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
    IonCard,
    IonCardContent,
    IonButton,
    BiteComponent,
  ],
})
export class BiteTrailBitesPage {
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
}
