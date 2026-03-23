import { ChangeDetectionStrategy, Component, input } from '@angular/core';
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
import { Bite, PublicUser } from 'model';

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
  employees = input<PublicUser[] | undefined>([]);
  bites = input<Bite[] | undefined>([]);

  protected selectEmployee(): void {
    //TODO: implement employee selection logic
  }
}
