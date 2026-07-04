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
  IonText,
} from '@ionic/angular/standalone';
import { Geopoint, PublicUser, Restaurant } from 'model';
import { MapComponent } from 'bite-tribe-common/map';
import { DashboardRestaurantCandidate } from 'bite-tribe-business/dashboard-data-access';
import { TranslocoPipe } from '@jsverse/transloco';

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
    IonText,
    TranslocoPipe,
  ],
  styleUrl: 'dashboard.component.scss',
})
export class DashboardComponent {
  organisations = input<PublicUser[]>();
  restaurants = input<Restaurant[]>();
  bitePlaces = input<string[]>();
  restaurantCandidates = input<DashboardRestaurantCandidate[]>();

  isAuthenticated = input(false);
  gpsPosition = input<Geopoint | null | undefined>();

  readonly logoutClick = output();
  readonly gotoSettings = output();
  readonly gotoMigrations = output();

  readonly restaurantClick = output<Restaurant>();
  readonly restaurantCandidateClick = output<DashboardRestaurantCandidate>();
  readonly organisationClick = output<PublicUser>();
  readonly placeClick = output<string>();

  candidateEvidenceCount(candidate: DashboardRestaurantCandidate): number {
    return candidate.evidence?.biteCount ?? candidate.biteIds?.length ?? 0;
  }

  candidateBiteEvidence(candidate: DashboardRestaurantCandidate): string {
    const biteNames = candidate.bites
      .map((bite) => bite.name || bite.place)
      .filter((name): name is string => !!name?.trim())
      .slice(0, 3);

    return biteNames.join(', ');
  }

  candidateLocation(candidate: DashboardRestaurantCandidate): string {
    return [candidate.position?.latitude, candidate.position?.longitude].every(
      (coordinate) => Number.isFinite(coordinate),
    )
      ? `${candidate.position.latitude}, ${candidate.position.longitude}`
      : '';
  }
}
