import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonLabel,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import { Bite, LikeClick, Menu, MenuItem, Restaurant } from 'model';
import { MapComponent } from 'bite-tribe-common/map';
import { TitleCasePipe } from '@angular/common';
import { EnsureProtocolPipe } from '../../../pipes/ensure-protocol.pipe';
import { RestaurantImageComponent } from '../../restaurant-image/restaurant-image.component';
import { getPosition } from '../../../utils/get-position';
import { getDistance } from '../../../utils/get-distance';
import { DistanceComponent } from 'common/distance';
import { uniqueBitesByName } from '../../../utils/unique-bites-by-name';
import { uniqueTagsFromBites } from '../../../utils/unique-tags-from-bites';
import { TranslocoPipe } from '@jsverse/transloco';
import { TagsInputComponent } from 'common/ui/tags';

@Component({
  selector: 'restaurant',
  templateUrl: 'restaurant.component.html',
  styleUrl: './restaurant.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonButton,
    IonIcon,
    IonSkeletonText,
    MapComponent,
    IonLabel,
    TitleCasePipe,
    EnsureProtocolPipe,
    RestaurantImageComponent,
    DistanceComponent,
    TranslocoPipe,
    TagsInputComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantComponent {
  bite = input<Bite>();
  bites = input<Bite[]>();
  userId = input<string>();
  restaurant = input<Restaurant>();
  menu = input<Menu>();

  readonly createBiteClick = output<MenuItem>();
  readonly showMenuClick = output<Restaurant | undefined>();
  readonly showBitesClick = output<Restaurant | undefined>();
  readonly biteClick = output<Bite>();
  readonly likeButtonClick = output<LikeClick>();
  readonly selectedSegment = signal<'bites' | 'menu'>('bites');

  /**
   * The restaurant document has not arrived yet. The page used to assemble
   * itself as the reads landed, which put its empty states and its menu button
   * on screen before it was known whether the restaurant was loaded at all. It
   * now holds a skeleton until the document resolves, the same way Bite details
   * does. See GitHub issue #1381.
   */
  isLoading = computed(() => !this.restaurant());

  /**
   * Whether the loaded restaurant carries a menu to navigate to. Without one
   * `navigateToMenu` falls back to a route keyed by place name, which lands on
   * the empty-menu page even for a restaurant that has a menu, so the button is
   * gated on this the way the Bites button is gated on its Bite count.
   */
  hasMenu = computed(() => !!this.restaurant()?.menuId);

  ratedBites = computed(() =>
    (this.bites() || []).filter(
      (bite): bite is Bite & { rating: number } =>
        bite.rating !== undefined && bite.rating !== null && bite.rating !== 0,
    ),
  );

  ratedBiteCount = computed(() => this.ratedBites().length);

  bitesCount = computed(() => this.uniqueBites().length);

  averageBiteRating = computed(() => {
    const ratedBites = this.ratedBites();
    const totalRating = ratedBites.reduce((acc, bite) => acc + bite.rating, 0);
    const average = ratedBites.length > 0 ? totalRating / ratedBites.length : 0;
    return Math.round(average * 10) / 10;
  });

  placeName = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();
    return restaurant?.name || bite?.place;
  });

  placeDistance = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();
    return getDistance(restaurant, bite);
  });

  position = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();
    return getPosition(restaurant, bite);
  });

  uniqueBites = computed(() => {
    const bites = this.bites() || [];
    return uniqueBitesByName(bites).sort(
      (a, b) => (a.price || 0) - (b.price || 0),
    );
  });

  uniqueTags = computed(() => uniqueTagsFromBites(this.bites() || []));

  setSelectedSegment(selectedSegment: unknown): void {
    if (selectedSegment !== 'bites' && selectedSegment !== 'menu') {
      return;
    }
    this.selectedSegment.set(selectedSegment);
  }
}
