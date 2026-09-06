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
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { Geopoint, Restaurant } from 'model';
import { MapComponent } from 'bite-tribe-common/map';
import { TranslocoPipe } from '@jsverse/transloco';

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

  readonly logoutClick = output();
  readonly sectionClick = output<DashboardSection>();

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
