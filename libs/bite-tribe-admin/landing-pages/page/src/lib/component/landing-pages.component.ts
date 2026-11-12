import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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
  IonTextarea,
  IonThumbnail,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { SearchBite } from 'model';
import { MIN_SEARCH_TEXT_LENGTH } from 'bite-tribe-admin/bites-data-access';
import {
  LandingPage,
  LandingPageDraft,
  LandingPageStatus,
  MAX_ITEMS,
  MIN_ITEMS,
  landingPageUrl,
} from 'bite-tribe-admin/landing-pages-data-access';
import { LandingPageEntry } from './landing-page-entry';

export type LandingPageField = Exclude<
  keyof LandingPageDraft,
  'biteIds' | 'aliases'
>;

/**
 * The operator's city landing page editor (epic #1487, issue #1490).
 *
 * The saved pages on the left, the page being edited on the right: its
 * details, its three to five Bites in order, and the actions. Bites are picked
 * with the same `searchBites` lookup the Bite search tool uses.
 *
 * Publish is one button that saves and then publishes, so what goes live is
 * always what is on screen. Withdraw sits apart and behind a confirmation,
 * because it takes a page out of search results.
 */
@Component({
  selector: 'lib-landing-pages',
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
    IonTextarea,
    IonSearchbar,
    IonSpinner,
    IonThumbnail,
    TranslocoPipe,
  ],
  templateUrl: './landing-pages.component.html',
  styleUrl: './landing-pages.component.scss',
})
export class LandingPagesComponent {
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly pages = input<LandingPage[]>([]);
  readonly loading = input(false);
  readonly loadFailed = input(false);
  readonly editing = input(false);
  readonly current = input<LandingPage | undefined>(undefined);
  readonly draft = input.required<LandingPageDraft>();
  readonly entries = input<LandingPageEntry[]>([]);
  readonly results = input<SearchBite[]>([]);
  readonly searching = input(false);
  readonly busy = input(false);
  readonly publishable = input(false);
  readonly full = input(false);
  readonly previewHtml = input<string | undefined>(undefined);

  readonly newPage = output<void>();
  readonly openPage = output<LandingPage>();
  readonly fieldChange = output<{ field: LandingPageField; value: string }>();
  readonly aliasesChange = output<string>();
  readonly searchSubmit = output<string>();
  readonly addBite = output<SearchBite>();
  readonly removeBite = output<string>();
  readonly moveBite = output<{ biteId: string; offset: -1 | 1 }>();
  readonly save = output<void>();
  readonly preview = output<void>();
  readonly closePreview = output<void>();
  readonly publish = output<void>();
  readonly withdraw = output<void>();
  readonly logoutClick = output<void>();

  readonly term = signal('');
  readonly minItems = MIN_ITEMS;
  readonly maxItems = MAX_ITEMS;

  readonly status = computed<LandingPageStatus | undefined>(
    () => this.current()?.status,
  );

  /** The city is the page's id and URL, so it is fixed once the page exists. */
  readonly cityLocked = computed(() => !!this.current());

  readonly publicUrl = computed(() => {
    const draft = this.draft();

    return draft.city ? landingPageUrl(draft) : undefined;
  });

  /** The alias URLs, each of which redirects to {@link publicUrl}. */
  readonly aliasUrls = computed(() =>
    this.draft().aliases.map((alias) => landingPageUrl({ city: alias })),
  );

  readonly chosenIds = computed(
    () => new Set(this.entries().map((entry) => entry.biteId)),
  );

  /**
   * The callable's own HTML, rendered in a sandboxed frame with no script
   * permission. It is trusted for display only because it comes from our
   * callable and the frame cannot run anything it contains.
   */
  readonly previewDoc = computed<SafeHtml | undefined>(() => {
    const html = this.previewHtml();

    return html ? this.sanitizer.bypassSecurityTrustHtml(html) : undefined;
  });

  canSearch(): boolean {
    return this.term().trim().length >= MIN_SEARCH_TEXT_LENGTH;
  }

  onTermChange(term: string): void {
    this.term.set(term);
  }

  onSearch(): void {
    if (this.canSearch()) {
      this.searchSubmit.emit(this.term().trim());
    }
  }

  onField(field: LandingPageField, value: string | null | undefined): void {
    this.fieldChange.emit({ field, value: value ?? '' });
  }

  async onWithdraw(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.transloco.translate('admin-landing-withdraw-confirm-title'),
      subHeader: this.draft().title,
      message: this.transloco.translate(
        'admin-landing-withdraw-confirm-message',
      ),
      buttons: [
        { text: this.transloco.translate('cancel'), role: 'cancel' },
        {
          text: this.transloco.translate('admin-landing-withdraw'),
          role: 'destructive',
          handler: (): void => this.withdraw.emit(),
        },
      ],
    });

    await alert.present();
  }
}
