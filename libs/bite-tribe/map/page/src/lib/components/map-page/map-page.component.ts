import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { MapComponent, MapSelectionComponent } from 'bite-tribe-common/map';
import type { Bite, Geopoint, LikeClick } from 'model';
import { BiteComponent } from 'bite-tribe-common/bite';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'map-page',
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonFab,
    IonFabButton,
    IonIcon,
    MapComponent,
    BiteComponent,
    MapSelectionComponent,
    TranslocoPipe,
  ],
})
export class MapPageComponent {
  bites = input<Bite[]>();
  isAuthenticated = input(false);
  gpsPosition = input<Geopoint | null | undefined>();
  userId = input<string>();
  enableZoom = input(true);
  showMyPositionButton = input(false);
  /** Draws a label, such as a stop's number, in a Bite's marker. By Bite id. */
  markerLabels = input<Record<string, string>>({});
  /** Joins the Bites with a line in the order they are given. */
  showRoute = input(false);
  clusterMarkers = input(true);

  readonly logoutClick = output();
  readonly likeButtonClick = output<LikeClick>();
  readonly biteClick = output<Bite>();
  readonly myPositionClick = output();

  private readonly map = viewChild(MapComponent);

  selectedBite: Bite | undefined | null;

  private readonly selection = viewChild(MapSelectionComponent);

  /** The open side panel covers the map's zoom control, which moves aside. */
  protected readonly hasSidePanel = computed(
    () => this.selection()?.isWideScreen() ?? false,
  );

  /**
   * Ionic's iOS swipe-back gesture listens on the router outlet for a touch
   * starting near the left edge, so a pinch with one finger there navigated
   * back instead of zooming. Leaflet has already handled the touch by the time
   * it reaches this host, so stopping it here keeps every map touch on the map.
   */
  keepTouchOnMap(event: Event): void {
    event.stopPropagation();
  }

  closeSelectedBite(): void {
    this.selectedBite = undefined;
  }

  /**
   * Recenters the map on the user's location and asks the container to refresh
   * nearby bites, matching the pull-to-refresh behavior of the home feed.
   */
  onMyPositionClick(): void {
    this.map()?.recenterOnGps();
    this.myPositionClick.emit();
  }

  positions = computed(() => {
    const bites = this.bites();
    return bites?.map(
      (bite: Bite) =>
        ({
          ...bite.position,
          id: bite.id,
          rating: this.getRating(bite),
        }) as Geopoint,
    );
  });

  onGeopointSelection(geopoint: Geopoint | undefined): void {
    if (!geopoint) {
      this.selectedBite = undefined;
      return;
    }

    this.selectedBite = this.bites()?.find(
      (bite: Bite) => bite.id === geopoint.id,
    );
  }

  private getRating(bite: Bite): number | undefined {
    if (!bite.rating || bite.rating === 0) return undefined;
    return bite.rating;
  }
}
