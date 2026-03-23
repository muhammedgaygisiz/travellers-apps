import { ChangeDetectionStrategy, Component } from '@angular/core';
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

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'organisation-dashboard',
  templateUrl: 'organisation-dashboard.html',
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
  ],
  styleUrl: 'organisation-dashboard.scss',
})
export class OrganisationDashboard {
  protected selectEmployee(): void {
    //TODO: implement employee selection logic
  }
}
