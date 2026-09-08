import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSearchbar,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { SearchBite } from 'model';
import {
  MAX_RESULTS,
  MIN_SEARCH_TEXT_LENGTH,
} from 'bite-tribe-admin/bites-data-access';

/**
 * The operator's Bite lookup: the results on the left, the selected Bite on the
 * right.
 *
 * Two columns rather than one list, on the same shape as user management,
 * because the errand is the same one: find the thing a report named and look at
 * what BiteTribe holds about it. The action taken on it — deleting an improper
 * Bite — is issue #1475, and this page is what will give that action its target.
 *
 * Unlike the account list, this is a search rather than a filter. There is no
 * "all the Bites" to load: `searchBites` is a query over the collection, so the
 * operator submits a term and waits (issue #1476).
 */
@Component({
  selector: 'lib-bite-search',
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
    IonNote,
    IonBadge,
    IonButton,
    IonSearchbar,
    IonSpinner,
    TranslocoPipe,
  ],
  templateUrl: './bite-search.component.html',
  styleUrl: './bite-search.component.scss',
})
export class BiteSearchComponent {
  readonly results = input<SearchBite[]>([]);
  readonly searching = input(false);
  readonly searched = input(false);
  readonly failed = input(false);
  readonly selected = input<SearchBite | undefined>(undefined);

  /**
   * Named `searchSubmit` rather than `search`: `search` is a standard DOM
   * event, and an output that shadows one is both a lint error and a real
   * ambiguity for anyone binding it.
   */
  readonly searchSubmit = output<string>();
  readonly selectBite = output<SearchBite>();
  readonly logoutClick = output<void>();

  readonly term = signal('');

  readonly minLength = MIN_SEARCH_TEXT_LENGTH;

  /**
   * The callable's result cap, shared with the consumer app's search.
   *
   * Rendered as a note when a search fills it, because a truncated answer and a
   * complete one look identical otherwise, and an operator who concludes a Bite
   * does not exist from a capped list has been misled by the UI.
   */
  readonly maxResults = MAX_RESULTS;

  /**
   * Whether the typed term is long enough for the callable to act on.
   *
   * The minimum is the callable's, and it applies to every caller. Saying so
   * before the search runs is the difference between "type one more character"
   * and an empty result list that reads as "no such Bite".
   */
  tooShort(): boolean {
    const length = this.term().trim().length;

    return length > 0 && length < MIN_SEARCH_TEXT_LENGTH;
  }

  canSearch(): boolean {
    return this.term().trim().length >= MIN_SEARCH_TEXT_LENGTH;
  }

  onTermChange(term: string): void {
    this.term.set(term);
  }

  onSearch(): void {
    if (!this.canSearch()) {
      return;
    }

    this.searchSubmit.emit(this.term().trim());
  }
}
