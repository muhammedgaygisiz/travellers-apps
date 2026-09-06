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

/**
 * Place names that Bites carry but no verified restaurant answers to yet.
 *
 * Picking one opens the new-restaurant form seeded with that name, which is how
 * an operator turns a place people are already eating at into a restaurant.
 */
@Component({
  selector: 'lib-bite-places',
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
      [isAuthenticated]="true"
      (logoutClick)="logoutClick.emit()"
    >
      <ion-content class="ion-padding">
        <div class="bite-places">
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ 'bite-places' | transloco }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="full" data-testid="bite-places">
                @for (place of places(); track place) {
                  <ion-item [button]="true" (click)="placeClick.emit(place)">
                    <ion-label>{{ place }}</ion-label>
                  </ion-item>
                } @empty {
                  <p>{{ 'no-bite-places-found' | transloco }}</p>
                }
              </ion-list>
            </ion-card-content>
          </ion-card>
        </div>
      </ion-content>
    </ta-page>
  `,
  styles: `
    /* Centred on the same measure as the admin dashboard's operations list, so
       an operator moving between the two surfaces keeps one column width. */
    .bite-places {
      margin: 0 auto;
      max-width: 40rem;
    }
  `,
})
export class BitePlaces {
  readonly places = input<string[]>([]);

  readonly placeClick = output<string>();
  readonly logoutClick = output<void>();
}
