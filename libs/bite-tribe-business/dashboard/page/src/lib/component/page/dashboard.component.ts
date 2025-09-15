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
  IonContent,
  IonText,
} from '@ionic/angular/standalone';
import { RestaurantComponent } from '../restaurant/restaurant.component';
import { Restaurant } from 'model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'bt-business-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [
    PageComponent,
    IonContent,
    IonCard,
    IonCardContent,
    IonText,
    RestaurantComponent,
  ],
  styleUrl: 'dashboard.component.scss',
})
export class DashboardComponent {
  restaurants = input<Restaurant[]>();
  isAuthenticated = input(false);

  readonly logoutClick = output();

  readonly gotoSettings = output();

  readonly gotoMigrations = output();

  readonly restaurantClick = output<Restaurant>();
  readonly createRestaurantClick = output<Restaurant>();
}
