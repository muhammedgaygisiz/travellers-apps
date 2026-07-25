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
import { MapComponent } from 'bite-tribe-common/map';
import type { Bite, Geopoint, LikeClick } from 'model';
import { BiteComponent } from 'bite-tribe-common/bite';
import { TranslocoPipe } from '@jsverse/transloco';
import { SnapDrawerComponent } from '../snap-drawer/snap-drawer.component';

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
    SnapDrawerComponent,
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

  readonly logoutClick = output();
  readonly likeButtonClick = output<LikeClick>();
  readonly biteClick = output<Bite>();
  readonly myPositionClick = output();

  private readonly map = viewChild(MapComponent);

  selectedBite: Bite | undefined | null;

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
