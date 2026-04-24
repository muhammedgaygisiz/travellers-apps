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
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { Bite, Like, Menu, MenuItem, Restaurant } from 'model';
import { MapComponent } from 'bite-tribe-common/map';
import { TitleCasePipe } from '@angular/common';
import { EnsureProtocolPipe } from '../../pipes/ensure-protocol.pipe';
import { RestaurantImageComponent } from '../restaurant-image/restaurant-image.component';
import { getPosition } from '../../utils/get-position';
import { getDistance } from '../../utils/get-distance';
import { DistanceComponent } from 'common/distance';
import { uniqueBitesByName } from '../../utils/unique-bites-by-name';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'restaurant',
  templateUrl: 'restaurant.component.html',
  styleUrl: './restaurant.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonButton,
    IonIcon,
    MapComponent,
    IonList,
    IonItem,
    IonLabel,
    TitleCasePipe,
    EnsureProtocolPipe,
    RestaurantImageComponent,
    DistanceComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantComponent {
  bite = input<Bite>();
  bites = input<Bite[]>();
  userId = input<string>();
  restaurant = input<Restaurant>();
  menu = input<Menu>();
  darkTheme = input<boolean>(false);

  readonly createBiteClick = output<MenuItem>();
  readonly showMenuClick = output<Restaurant | undefined>();
  readonly showBitesClick = output<Restaurant | undefined>();
  readonly biteClick = output<Bite>();
  readonly likeButtonClick = output<Like>();
  readonly selectedSegment = signal<'bites' | 'menu'>('bites');

  ratedBites = computed(() =>
    (this.bites() || []).filter(
      (bite): bite is Bite & { rating: number } =>
        bite.rating !== undefined && bite.rating !== null,
    ),
  );

  ratedBiteCount = computed(() => this.ratedBites().length);

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

  setSelectedSegment(selectedSegment: any): void {
    if (selectedSegment != 'bites' && selectedSegment !== 'menu') {
      return;
    }
    this.selectedSegment.set(selectedSegment);
  }
}
