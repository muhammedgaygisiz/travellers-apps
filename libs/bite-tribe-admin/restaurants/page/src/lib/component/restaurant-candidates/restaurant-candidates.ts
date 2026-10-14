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
    IonButton,
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

    .restaurant-candidates__paging {
      align-items: center;
      display: flex;
      gap: 0.5rem;
      justify-content: space-between;
    }
  `,
})
export class RestaurantCandidates {
  readonly candidates = input<AdminRestaurantCandidate[]>([]);
  /**
   * More candidates are pending than the list shows. Said out loud so five rows
   * do not read as "that is all of them" (issue #1506).
   */
  readonly hasMore = input(false);
  /** The page shown, counted from 1 (issue #1507). */
  readonly pageNumber = input(1);
  /** A page is being read; paging waits for it rather than queueing. */
  readonly loading = input(false);

  readonly candidateClick = output<AdminRestaurantCandidate>();
  readonly nextPageClick = output<void>();
  readonly previousPageClick = output<void>();
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
