import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonContent } from '@ionic/angular/standalone';
import { MapComponent } from 'bite-tribe-common/map';
import type { Bite, Geopoint } from 'model';
import { BiteComponent } from 'bite-tribe-common/bite';
import { SnapDrawerComponent } from '../snap-drawer/snap-drawer.component';

@Component({
  selector: 'map-page',
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    MapComponent,
    BiteComponent,
    SnapDrawerComponent,
  ],
})
export class MapPageComponent {
  bites = input<any[]>();
  isAuthenticated = input(false);
  gpsPosition = input<Geopoint | null | undefined>();
  userId = input<string>();
  enableZoom = input(true);

  readonly logoutClick = output();
  readonly gotoSettings = output();
  readonly gotoMyProfile = output();
  readonly gotoMyBucketlists = output();
  readonly gotoMyBites = output();
  readonly likeButtonClick = output<{ likeType: string; biteId: string }>();
  readonly biteClick = output<Bite>();
  readonly restaurantClick = output<Bite>();

  selectedBite: Bite | undefined | null;

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
