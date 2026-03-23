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
  IonCheckbox,
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
    IonCheckbox,
  ],
  styleUrl: 'organisation-dashboard.scss',
})
export class OrganisationDashboard {
  employees = input<PublicUser[] | undefined>([]);
  bites = input<Bite[] | undefined>([]);

  readonly employeeSelected = output<PublicUser>();

  protected selectEmployee(employee: PublicUser): void {
    this.employeeSelected.emit(employee);
  }
}
