import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonButton, IonContent, IonIcon } from '@ionic/angular/standalone';
import { Bite, Like, Restaurant } from 'model';
import { MapComponent } from 'bite-tribe-common/map';
import { RestaurantImageComponent } from '../restaurant-image/restaurant-image.component';
import { getPosition } from '../../utils/get-position';
import { getDistance } from '../../utils/get-distance';
import { DistanceComponent } from 'common/distance';
import { uniqueBitesByName } from '../../utils/unique-bites-by-name';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'bite-place',
  templateUrl: 'bite-place.component.html',
  styleUrl: './bite-place.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonButton,
    IonIcon,
    MapComponent,
    RestaurantImageComponent,
    DistanceComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BitePlaceComponent {
  bite = input<Bite>();
  bites = input<Bite[]>();
  userId = input<string>();

  readonly showBitesClick = output<Restaurant | undefined>();
  readonly biteClick = output<Bite>();
  readonly likeButtonClick = output<Like>();

  ratedBites = computed(() =>
    (this.bites() || []).filter((bite): bite is Bite & { rating: number } => {
      return (
        bite.rating !== undefined && bite.rating !== null && bite.rating !== 0
      );
    }),
  );

  bitesCount = computed(() => this.bites()?.length);
  ratedBiteCount = computed(() => this.ratedBites().length);

  averageBiteRating = computed(() => {
    const ratedBites = this.ratedBites();
    const totalRating = ratedBites.reduce((acc, bite) => acc + bite.rating, 0);
    const average = ratedBites.length > 0 ? totalRating / ratedBites.length : 0;
    return Math.round(average * 10) / 10;
  });

  placeName = computed(() => this.bite()?.place);

  placeDistance = computed(() => getDistance(undefined, this.bite()));

  position = computed(() => getPosition(undefined, this.bite()));

  uniqueBites = computed(() => {
    const bites = this.bites() || [];
    return uniqueBitesByName(bites).sort(
      (a, b) => (a.price || 0) - (b.price || 0),
    );
  });
}
