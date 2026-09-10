import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
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
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { Restaurant } from 'model';

/**
 * The restaurants a restaurant maintains.
 *
 * Only the list and the way into one: creating a restaurant from a candidate or
 * from an unmatched Bite place is operator work and lives in the admin app
 * since issue #1473.
 *
 * The list holds exactly the restaurants assigned to the signed-in account
 * (issue #1079), so empty is an ordinary state rather than a failure: an
 * account holds nothing until an operator assigns it a restaurant, and no
 * production restaurant was assigned before that surface existed. The empty
 * state therefore says who to ask, because there is nothing the account can do
 * here to fix it - self-service claiming was considered and closed as not
 * planned (issue #1076). It replaces a bare "No restaurants found.", which
 * read as "BiteTribe has no restaurants" to the one audience for which that is
 * never the reason.
 */
@Component({
  selector: 'bt-business-restaurants',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    TranslocoPipe,
  ],
  template: `
    <ta-page
      [chrome]="{ showFooter: false, fullWidth: true, enableBackButton: true }"
      [isAuthenticated]="isAuthenticated()"
      (logoutClick)="logoutClick.emit()"
    >
      <ion-content class="ion-padding">
        <div class="section-page">
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ 'restaurants' | transloco }}</ion-card-title>
            </ion-card-header>
            <ion-card-content class="section-page__list">
              <ion-list lines="full" data-testid="dashboard-restaurants">
                @for (restaurant of restaurants(); track restaurant.id) {
                  <ion-item
                    [button]="true"
                    (click)="restaurantClick.emit(restaurant)"
                  >
                    <ion-label>{{ restaurant.name }}</ion-label>
                  </ion-item>
                } @empty {
                  <div class="section-page__empty" data-testid="no-restaurants">
                    <p>{{ 'no-assigned-restaurants' | transloco }}</p>
                    <p>{{ 'no-assigned-restaurants-contact' | transloco }}</p>
                  </div>
                }
              </ion-list>
            </ion-card-content>
          </ion-card>
        </div>
      </ion-content>
    </ta-page>
  `,
  styleUrl: '../section-page.scss',
})
export class RestaurantsComponent {
  restaurants = input<Restaurant[]>();
  isAuthenticated = input(false);

  readonly logoutClick = output();
  readonly restaurantClick = output<Restaurant>();
}
