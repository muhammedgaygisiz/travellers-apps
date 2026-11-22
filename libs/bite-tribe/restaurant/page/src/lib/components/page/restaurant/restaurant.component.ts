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
  IonCard,
  IonContent,
  IonIcon,
  IonLabel,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import {
  Bite,
  LikeClick,
  linkNetworkIcon,
  linkNetworkName,
  openTimeRangesOf,
  Menu,
  MenuItem,
  Restaurant,
  restaurantCategoriesOf,
  restaurantDietaryStatementsOf,
} from 'model';
import { MapComponent } from 'bite-tribe-common/map';
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
    IonCard,
    IonIcon,
    IonSkeletonText,
    MapComponent,
    IonLabel,
    EnsureProtocolPipe,
    RestaurantImageComponent,
    DistanceComponent,
    TranslocoPipe,
    TagsInputComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantComponent {
  /** How each link is shown: its logo and name (#2224). */
  protected readonly linkNetworkIcon = linkNetworkIcon;
  protected readonly linkNetworkName = linkNetworkName;
  /** A day's hours as guests see them (#2227). */
  protected readonly openTimeRangesOf = openTimeRangesOf;

  bite = input<Bite>();
  bites = input<Bite[]>();
  userId = input<string>();
  restaurant = input<Restaurant>();
  menu = input<Menu>();
  /** The route's Bites have not arrived yet (first load only). */
  bitesLoading = input(false);
  /** The route's restaurant id resolved to nothing, or could not be read. */
  notFound = input(false);

  readonly createBiteClick = output<MenuItem>();
  readonly showMenuClick = output<Restaurant | undefined>();
  readonly showBitesClick = output<Restaurant | undefined>();
  readonly biteClick = output<Bite>();
  readonly likeButtonClick = output<LikeClick>();
  readonly backClick = output<void>();
  readonly selectedSegment = signal<'bites' | 'menu'>('bites');

  /**
   * The restaurant document has not arrived yet. The page used to assemble
   * itself as the reads landed, which put its empty states and its menu button
   * on screen before it was known whether the restaurant was loaded at all. It
   * now holds a skeleton until the document resolves, the same way Bite details
   * does. See GitHub issue #1381.
   *
   * It also waits for the Bites. The rating, the Bite count and the tags come
   * from them, and they arrive separately, so those parts used to pop in after
   * the skeleton had gone. A restaurant that cannot be found ends the wait in
   * the not-found state instead of a skeleton that never resolves. See GitHub
   * issue #2124.
   */
  isLoading = computed(
    () => !this.notFound() && (!this.restaurant() || this.bitesLoading()),
  );

  /**
   * Whether the loaded restaurant carries a menu to navigate to. Without one
   * `navigateToMenu` falls back to a route keyed by place name, which lands on
   * the empty-menu page even for a restaurant that has a menu, so the button is
   * gated on this the way the Bites link is gated on its Bite count.
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

  /**
   * The kind of venue, as the restaurant states it (issue #2131). Empty for a
   * restaurant that has not said, and then nothing is shown.
   */
  categories = computed(() => restaurantCategoriesOf(this.restaurant()));

  /**
   * What the restaurant says about its whole kitchen (issue #2194), and its
   * cross-contamination note. Both shown as declared by the restaurant.
   */
  dietaryStatements = computed(() =>
    restaurantDietaryStatementsOf(this.restaurant()?.dietaryStatements),
  );

  crossContaminationNote = computed(
    () => this.restaurant()?.crossContaminationNote?.trim() ?? '',
  );

  setSelectedSegment(selectedSegment: unknown): void {
    if (selectedSegment !== 'bites' && selectedSegment !== 'menu') {
      return;
    }
    this.selectedSegment.set(selectedSegment);
  }
}
