import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AlertController,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSearchbar,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
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
 * what BiteTribe holds about it, then act on it.
 *
 * Unlike the account list, this is a search rather than a filter. There is no
 * "all the Bites" to load: `searchBites` is a query over the collection, so the
 * operator submits a term and waits (issue #1476).
 *
 * The detail column leads with the image, because on an improper Bite the image
 * is usually the thing that has to be judged: a wall of text fields cannot
 * answer "is this food" or "is this abusive", which is the whole question an
 * operator opened the page to settle.
 *
 * Deleting sits below everything, in its own section and behind both a required
 * reason and a confirmation. It is irreversible — the Bite is deleted outright
 * rather than hidden, and the image goes with it — so it is deliberately not
 * one misclick away from the result list (issue #1475).
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
    IonInput,
    IonSearchbar,
    IonSpinner,
    TranslocoPipe,
  ],
  templateUrl: './bite-search.component.html',
  styleUrl: './bite-search.component.scss',
})
export class BiteSearchComponent {
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  readonly results = input<SearchBite[]>([]);
  readonly searching = input(false);
  readonly searched = input(false);
  readonly failed = input(false);
  readonly selected = input<SearchBite | undefined>(undefined);
  readonly deleting = input(false);

  /**
   * Named `searchSubmit` rather than `search`: `search` is a standard DOM
   * event, and an output that shadows one is both a lint error and a real
   * ambiguity for anyone binding it.
   */
  readonly searchSubmit = output<string>();
  readonly selectBite = output<SearchBite>();
  readonly deleteBite = output<{ biteId: string; reason: string }>();
  readonly logoutClick = output<void>();

  readonly term = signal('');

  /**
   * Why the Bite is being removed.
   *
   * Cleared whenever the selection changes, so a reason typed for one Bite
   * cannot be submitted against another — the same rule the tier reason in user
   * management follows, and for the same reason: the log entry is the only
   * record either action leaves.
   */
  readonly reason = signal('');

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

  /**
   * The Bite's image, whichever field holds it.
   *
   * `imagePath` is the download URL `setBiteImagePathOnUpload` writes and is
   * what a Bite normally has; `image` is the base64 copy a Bite still carries
   * while its upload is pending or after one failed. Same precedence as the
   * consumer app's Bite card and the clustering table.
   */
  readonly imageSrc = computed<string | undefined>(() => {
    const bite = this.selected();

    return bite?.imagePath || bite?.image || undefined;
  });

  /**
   * The delete is gated on a reason as well as on a selection, because the
   * callable requires one: a rejected call is a worse way to learn that than a
   * disabled button.
   */
  readonly canDelete = computed(
    () => !!this.selected() && this.reason().trim().length > 0,
  );

  onTermChange(term: string): void {
    this.term.set(term);
  }

  onReasonChange(reason: string): void {
    this.reason.set(reason);
  }

  onSearch(): void {
    if (!this.canSearch()) {
      return;
    }

    this.reason.set('');
    this.searchSubmit.emit(this.term().trim());
  }

  onSelect(bite: SearchBite): void {
    this.reason.set('');
    this.selectBite.emit(bite);
  }

  /**
   * Confirms before deleting.
   *
   * The alert repeats the Bite rather than trusting that the card behind it is
   * still the one being read, and it says outright that nothing comes back:
   * there is no tombstone, no restore, and nothing left to show an author who
   * disputes the removal.
   */
  async onDelete(): Promise<void> {
    const bite = this.selected();

    if (!bite || !this.canDelete()) {
      return;
    }

    const reason = this.reason().trim();
    const alert = await this.alertController.create({
      header: this.transloco.translate('admin-bites-delete-confirm-title'),
      subHeader: bite.name || bite.id,
      message: this.transloco.translate('admin-bites-delete-confirm-message'),
      buttons: [
        { text: this.transloco.translate('cancel'), role: 'cancel' },
        {
          text: this.transloco.translate('admin-bites-delete'),
          role: 'destructive',
          handler: (): void => {
            this.reason.set('');
            this.deleteBite.emit({ biteId: bite.id, reason });
          },
        },
      ],
    });

    await alert.present();
  }
}
