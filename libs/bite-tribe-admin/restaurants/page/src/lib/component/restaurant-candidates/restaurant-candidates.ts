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
  IonText,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { AdminRestaurantCandidate } from 'bite-tribe-admin/restaurants-data-access';

/**
 * The pending restaurant candidates, with the Bite evidence behind each.
 *
 * BiteTribe-internal: turning a candidate into a verified restaurant is an
 * operator decision, so this stopped being a card on the business dashboard
 * with issue #1473.
 */
@Component({
  selector: 'lib-restaurant-candidates',
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
    IonText,
    TranslocoPipe,
  ],
  templateUrl: './restaurant-candidates.html',
  styles: `
    /* Centred on the same measure as the admin dashboard's operations list, so
       an operator moving between the two surfaces keeps one column width. */
    .restaurant-candidates {
      margin: 0 auto;
      max-width: 40rem;
    }
  `,
})
export class RestaurantCandidates {
  readonly candidates = input<AdminRestaurantCandidate[]>([]);

  readonly candidateClick = output<AdminRestaurantCandidate>();
  readonly logoutClick = output<void>();

  evidenceCount(candidate: AdminRestaurantCandidate): number {
    return candidate.evidence?.biteCount ?? candidate.biteIds?.length ?? 0;
  }

  biteEvidence(candidate: AdminRestaurantCandidate): string {
    return candidate.bites
      .map((bite) => bite.name || bite.place)
      .filter((name): name is string => !!name?.trim())
      .slice(0, 3)
      .join(', ');
  }

  candidateLocation(candidate: AdminRestaurantCandidate): string {
    return [candidate.position?.latitude, candidate.position?.longitude].every(
      (coordinate) => Number.isFinite(coordinate),
    )
      ? `${candidate.position.latitude}, ${candidate.position.longitude}`
      : '';
  }
}
