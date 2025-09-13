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
import { Geopoint } from 'model';

@Component({
  selector: 'map-page',
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, MapComponent],
})
export class MapPageComponent {
  bites = input<any[]>();
  isAuthenticated = input(false);

  readonly logoutClick = output();
  readonly gotoSettings = output();
  readonly gotoMyBucketlists = output();
  readonly gotoMyBites = output();

  positions = computed(() => {
    const bites = this.bites();

    return bites?.map((bite) => {
      return bite.position as Geopoint;
    });
  });
}
