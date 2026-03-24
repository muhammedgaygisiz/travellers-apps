import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCheckbox,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
} from '@ionic/angular/standalone';
import { Bite, PublicUser } from 'model';
import { EmployeeNamePipe } from './pipes/employee-name.pipe';

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
    IonButton,
    IonNote,
    EmployeeNamePipe,
  ],
  styleUrl: 'organisation-dashboard.scss',
})
export class OrganisationDashboard {
  employees = input<PublicUser[] | undefined>([]);
  bites = input<Bite[] | undefined>([]);
  selectedEmployeeIds = input<string[]>([]);
  selectedBiteIds = input<string[]>([]);

  readonly employeeToggled = output<PublicUser>();
  readonly biteToggled = output<Bite>();
  readonly loadBitesClicked = output<void>();
  readonly createBiteTrailClicked = output<void>();

  protected toggleEmployee(employee: PublicUser): void {
    this.employeeToggled.emit(employee);
  }

  protected toggleBite(bite: Bite): void {
    this.biteToggled.emit(bite);
  }

  protected onLoadBitesClicked(): void {
    this.loadBitesClicked.emit();
  }

  protected onCreateBiteTrailClicked(): void {
    this.createBiteTrailClicked.emit();
  }

  protected isEmployeeSelected(employee: PublicUser): boolean {
    return this.selectedEmployeeIds().includes(employee.userId);
  }

  protected isBiteSelected(bite: Bite): boolean {
    return this.selectedBiteIds().includes(bite.id);
  }
}
