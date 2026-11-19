import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import { Bite, LikeClick } from 'model';
import { MapComponent } from 'bite-tribe-common/map';
import { getPosition } from '../../../utils/get-position';
import { getDistance } from '../../../utils/get-distance';
import { DistanceComponent } from 'common/distance';
import { uniqueBitesByName } from '../../../utils/unique-bites-by-name';
import { uniqueTagsFromBites } from '../../../utils/unique-tags-from-bites';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagsInputComponent } from 'common/ui/tags';

@Component({
  selector: 'bite-place',
  templateUrl: 'bite-place.component.html',
  styleUrl: './bite-place.component.scss',
  imports: [
    PageComponent,
    IonButton,
    IonContent,
    IonIcon,
    IonSkeletonText,
    MapComponent,
    DistanceComponent,
    TranslocoPipe,
    TagsInputComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BitePlaceComponent {
  bite = input<Bite>();
  bites = input<Bite[]>();
  userId = input<string>();
  /** The place's Bites have not arrived yet (first load only). */
  bitesLoading = input(false);
  /** The Bite this place was opened from, and so the place, is gone. */
  notFound = input(false);

  readonly showBitesClick = output<Bite | undefined>();
  readonly backClick = output<void>();

  /**
   * Holds a skeleton until the Bites arrive. The page used to render its
   * "not verified" banner at once, next to an empty name, rating and Bite
   * count, and fill them in as the read landed. A place whose Bites can no
   * longer be found ends in the not-found state instead. See GitHub issue
   * #2125, and #2124 for the verified restaurant page.
   */
  isLoading = computed(
    () => !this.notFound() && (this.bitesLoading() || !this.bite()),
  );
  readonly biteClick = output<Bite>();
  readonly likeButtonClick = output<LikeClick>();

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

  uniqueTags = computed(() => uniqueTagsFromBites(this.bites() || []));
}
