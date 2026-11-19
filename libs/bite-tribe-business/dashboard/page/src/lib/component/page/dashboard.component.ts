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
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { Geopoint, Restaurant } from 'model';
import { MapComponent } from 'bite-tribe-common/map';
import {
  restaurantSetupChecklist,
  SetupItem,
} from '../../utils/restaurant-setup-checklist';
import { TranslocoPipe } from '@jsverse/transloco';

/** A checklist item an owner tapped, with the restaurant it belongs to. */
export interface SetupItemClick {
  readonly restaurant: Restaurant;
  readonly item: SetupItem;
}

/** One restaurant's checklist, while it still has something missing. */
export interface RestaurantSetup {
  readonly restaurant: Restaurant;
  readonly items: readonly SetupItem[];
  readonly doneCount: number;
}

/** One surface the business app offers a restaurant. */
export interface DashboardSection {
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly icon: string;
  readonly path: string;
  readonly testId: string;
}

/**
 * The business app's home: the restaurants on a map, and one entry per surface.
 *
 * The lists used to render here in full, which made the dashboard the place
 * every read landed and the place every operator surface was bolted onto.
 * Since issue #1473 each section owns its own page, so a restaurant sees its
 * own content and nothing else — restaurant candidates and the unmatched Bite
 * places moved to the admin app entirely.
 *
 * What is left here is the one view a list cannot give: where the restaurants
 * are relative to each other and to the device.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'bt-business-dashboard',
  templateUrl: 'dashboard.component.html',
  imports: [
    PageComponent,
    IonContent,
    IonButton,
    IonCard,
    IonCardContent,
    MapComponent,
    IonList,
    IonLabel,
    IonItem,
    IonIcon,
    TranslocoPipe,
  ],
  styleUrl: 'dashboard.component.scss',
})
export class DashboardComponent {
  isAuthenticated = input(false);
  gpsPosition = input<Geopoint | null | undefined>();
  restaurants = input<Restaurant[]>([]);
  /**
   * The restaurants read has finished. Until then an empty list means nothing,
   * so the empty state waits for it rather than flashing on every sign-in.
   */
  restaurantsLoaded = input(false);

  readonly logoutClick = output();
  readonly sectionClick = output<DashboardSection>();
  readonly setupItemClick = output<SetupItemClick>();
  readonly checkAgainClick = output<void>();

  /** The support address the empty state offers (GitHub issue #2127). */
  protected readonly supportMailto = 'mailto:support@bitetribe.app';

  /**
   * The account holds no restaurant (GitHub issue #2127). The `business` role
   * and the assignment are two separate operator steps, and between them this
   * page had nothing of the account's to show, which read as a broken app. A
   * staff account with no restaurant record falls through `staffEntryGuard`
   * to this same page and gets the same state.
   */
  readonly showNoRestaurant = computed(
    () => this.restaurantsLoaded() && (this.restaurants() ?? []).length === 0,
  );

  /**
   * A checklist per restaurant the account holds that still lacks something
   * guests see (GitHub issue #2126). An owner is assigned by an operator and
   * used to land here with no guidance; the menu in particular usually arrives
   * built from Bite evidence and is the owner's to correct. A restaurant whose
   * every item is ticked drops out, so the list disappears once it is done.
   */
  readonly setups = computed<RestaurantSetup[]>(() =>
    (this.restaurants() ?? [])
      .map((restaurant) => {
        const items = restaurantSetupChecklist(restaurant);
        const doneCount = items.filter((item) => item.done).length;

        return { restaurant, items, doneCount };
      })
      .filter((setup) => setup.doneCount < setup.items.length),
  );

  /**
   * One marker per restaurant that has a usable position.
   *
   * Restaurants seeded before the position was required, or written by hand,
   * can carry a missing or non-numeric one; Leaflet takes those as `NaN`
   * coordinates and drops the whole layer rather than the one marker.
   */
  readonly restaurantPositions = computed<Geopoint[]>(() =>
    (this.restaurants() ?? [])
      .filter((restaurant) =>
        [restaurant.position?.latitude, restaurant.position?.longitude].every(
          (coordinate) => Number.isFinite(coordinate),
        ),
      )
      .map((restaurant) => ({
        id: restaurant.id,
        latitude: restaurant.position.latitude,
        longitude: restaurant.position.longitude,
      })),
  );

  /**
   * The map is worth rendering once it has something to show — the device
   * position, a restaurant, or both. Without either it is an empty world map,
   * which is why it stays hidden rather than reserving the space.
   */
  protected readonly setupIcon = (item: SetupItem): string =>
    item.done ? 'checkmark-circle' : 'ellipse-outline';

  readonly showMap = computed(
    () => !!this.gpsPosition() || this.restaurantPositions().length > 0,
  );

  /**
   * BiteTrails first: creating one is the action a restaurant comes here for,
   * where its restaurants are already there to be maintained.
   */
  readonly sections: readonly DashboardSection[] = [
    {
      titleKey: 'bite-trails',
      descriptionKey: 'dashboard-bite-trails-description',
      icon: 'footsteps-outline',
      path: '/bite-trails',
      testId: 'dashboard-section-bite-trails',
    },
    {
      titleKey: 'restaurants',
      descriptionKey: 'dashboard-restaurants-description',
      icon: 'restaurant-outline',
      path: '/restaurants',
      testId: 'dashboard-section-restaurants',
    },
  ];
}
