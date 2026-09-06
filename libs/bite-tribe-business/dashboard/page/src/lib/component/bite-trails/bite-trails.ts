import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  IonButton,
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
import { BiteTrail } from 'model';

/** The BiteTrails the signed-in account owns, and the way to create another. */
@Component({
  selector: 'bt-business-bite-trails',
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
    IonButton,
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
              <ion-card-title>{{ 'bite-trails' | transloco }}</ion-card-title>
            </ion-card-header>
            <ion-card-content class="section-page__list">
              <ion-list lines="full" data-testid="dashboard-bite-trails">
                @for (biteTrail of biteTrails(); track biteTrail.id) {
                  <ion-item>
                    <ion-label>{{ biteTrail.name }}</ion-label>
                  </ion-item>
                } @empty {
                  <p>{{ 'no-bite-trails-found' | transloco }}</p>
                }
              </ion-list>
              <ion-button
                expand="block"
                class="ion-margin-top"
                (click)="createBiteTrailClick.emit()"
              >
                {{ 'create-bite-trail' | transloco }}
              </ion-button>
            </ion-card-content>
          </ion-card>
        </div>
      </ion-content>
    </ta-page>
  `,
  styleUrl: '../section-page.scss',
})
export class BiteTrailsComponent {
  biteTrails = input<BiteTrail[]>();
  isAuthenticated = input(false);

  readonly logoutClick = output();
  readonly createBiteTrailClick = output<void>();
}
