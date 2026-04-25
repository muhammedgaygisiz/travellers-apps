import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { Geopoint, PublicUser, Restaurant } from 'model';
import { MapComponent } from 'bite-tribe-common/map';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'bt-business-dashboard',
  templateUrl: 'dashboard.component.html',
  imports: [
    PageComponent,
    IonContent,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    MapComponent,
    IonList,
    IonLabel,
    IonItem,
  ],
  styleUrl: 'dashboard.component.scss',
})
export class DashboardComponent {
  organisations = input<PublicUser[]>();
  restaurants = input<Restaurant[]>();
  bitePlaces = input<string[]>();

  isAuthenticated = input(false);
  gpsPosition = input<Geopoint | null | undefined>();

  readonly logoutClick = output();
  readonly gotoSettings = output();
  readonly gotoMigrations = output();

  readonly restaurantClick = output<Restaurant>();
  readonly organisationClick = output<PublicUser>();
  readonly placeClick = output<string>();
}
