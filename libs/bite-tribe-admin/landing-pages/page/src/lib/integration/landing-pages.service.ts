import { computed, inject, Injectable, signal } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ToastService } from 'toast';
import { SearchBite } from 'model';
import { BiteSearchDataAccessService } from 'bite-tribe-admin/bites-data-access';
import {
  LandingPage,
  LandingPageDraft,
  LandingPagesDataAccessService,
  MAX_ITEMS,
  MIN_ITEMS,
} from 'bite-tribe-admin/landing-pages-data-access';
import { LandingPageEntry } from '../component/landing-page-entry';

const emptyDraft = (): LandingPageDraft => ({
  city: '',
  cityName: '',
  countryCode: '',
  locale: 'en',
  title: '',
  metaDescription: '',
  intro: '',
  biteIds: [],
});

const entryFromSearch = (bite: SearchBite): LandingPageEntry => ({
  biteId: bite.id,
  name: bite.name || bite.id,
  place: bite.place ?? '',
  imageUrl: bite.imagePath || undefined,
});

/**
 * Holds the city page editor's state and runs its actions (issue #1490).
 *
 * The chosen Bites are kept as display entries rather than ids alone, so the
 * list can show a photo and a name for a Bite picked from search as well as
 * for one reopened from a saved page's snapshot. `biteIds` in the draft is
 * derived from them, so the order on screen is the order that is saved.
 */
@Injectable({ providedIn: 'root' })
export class LandingPagesService {
  private readonly dataAccess = inject(LandingPagesDataAccessService);
  private readonly biteSearch = inject(BiteSearchDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly toastService = inject(ToastService);

  readonly pages = signal<LandingPage[]>([]);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);

  /** The stored page being edited; undefined while composing a new one. */
  readonly current = signal<LandingPage | undefined>(undefined);
  /** Whether the editor is open at all. */
  readonly editing = signal(false);

  private readonly fields =
    signal<Omit<LandingPageDraft, 'biteIds'>>(emptyDraft());
  readonly entries = signal<LandingPageEntry[]>([]);

  readonly draft = computed<LandingPageDraft>(() => ({
    ...this.fields(),
    biteIds: this.entries().map((entry) => entry.biteId),
  }));

  readonly results = signal<SearchBite[]>([]);
  readonly searching = signal(false);

  readonly busy = signal(false);
  readonly previewHtml = signal<string | undefined>(undefined);

  /**
   * Whether Publish can succeed, judged the way the callable judges it, so the
   * button explains itself instead of failing.
   */
  readonly publishable = computed(() => {
    const draft = this.draft();

    return (
      draft.biteIds.length >= MIN_ITEMS &&
      draft.biteIds.length <= MAX_ITEMS &&
      !!draft.metaDescription.trim() &&
      !!draft.intro.trim()
    );
  });

  readonly full = computed(() => this.entries().length >= MAX_ITEMS);

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadFailed.set(false);

    try {
      this.pages.set(await this.dataAccess.list());
    } catch (error) {
      console.error('Failed to load landing pages:', error);
      this.loadFailed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  newPage(): void {
    this.current.set(undefined);
    this.fields.set(emptyDraft());
    this.entries.set([]);
    this.previewHtml.set(undefined);
    this.editing.set(true);
  }

  open(page: LandingPage): void {
    this.current.set(page);
    this.fields.set({
      city: page.city,
      cityName: page.cityName,
      countryCode: page.countryCode,
      locale: page.locale,
      title: page.title,
      metaDescription: page.metaDescription,
      intro: page.intro,
    });
    this.entries.set(
      page.items.map((item) => ({
        biteId: item.biteId,
        name: item.name,
        place: item.place,
        imageUrl: item.imageUrl,
      })),
    );
    this.previewHtml.set(undefined);
    this.editing.set(true);
  }

  updateField(
    field: keyof Omit<LandingPageDraft, 'biteIds'>,
    value: string,
  ): void {
    this.fields.update((fields) => ({ ...fields, [field]: value }));
  }

  async search(term: string): Promise<void> {
    this.searching.set(true);

    try {
      this.results.set(await this.biteSearch.search(term));
    } catch (error) {
      console.error('Failed to search for Bites:', error);
      this.results.set([]);
      await this.toast('admin-landing-search-failed', 'failure');
    } finally {
      this.searching.set(false);
    }
  }

  addBite(bite: SearchBite): void {
    if (this.full() || this.entries().some((e) => e.biteId === bite.id)) {
      return;
    }

    this.entries.update((entries) => [...entries, entryFromSearch(bite)]);
  }

  removeBite(biteId: string): void {
    this.entries.update((entries) =>
      entries.filter((entry) => entry.biteId !== biteId),
    );
  }

  move(biteId: string, offset: -1 | 1): void {
    this.entries.update((entries) => {
      const from = entries.findIndex((entry) => entry.biteId === biteId);
      const to = from + offset;

      if (from < 0 || to < 0 || to >= entries.length) {
        return entries;
      }

      const next = [...entries];
      [next[from], next[to]] = [next[to], next[from]];

      return next;
    });
  }

  async save(): Promise<LandingPage | undefined> {
    return this.run('admin-landing-saved', 'admin-landing-save-failed', () =>
      this.dataAccess.save(this.draft()),
    );
  }

  async preview(): Promise<void> {
    this.busy.set(true);

    try {
      this.previewHtml.set(await this.dataAccess.preview(this.draft()));
    } catch (error) {
      console.error('Failed to preview the landing page:', error);
      await this.toast('admin-landing-preview-failed', 'failure');
    } finally {
      this.busy.set(false);
    }
  }

  closePreview(): void {
    this.previewHtml.set(undefined);
  }

  /**
   * Saves, then publishes. One button rather than two, so what goes live is
   * always what is on screen and never the last save.
   */
  async publish(): Promise<void> {
    await this.run(
      'admin-landing-published',
      'admin-landing-publish-failed',
      async () => {
        const saved = await this.dataAccess.save(this.draft());
        return saved.status === 'published'
          ? saved
          : this.dataAccess.setStatus(saved.city, 'published');
      },
    );
  }

  async withdraw(): Promise<void> {
    const city = this.current()?.city;

    if (!city) {
      return;
    }

    await this.run(
      'admin-landing-withdrawn',
      'admin-landing-withdraw-failed',
      () => this.dataAccess.setStatus(city, 'withdrawn'),
    );
  }

  logout(): void {
    this.storeService.logout();
  }

  private async run(
    successKey: string,
    failureKey: string,
    action: () => Promise<LandingPage>,
  ): Promise<LandingPage | undefined> {
    this.busy.set(true);

    try {
      const page = await action();
      this.current.set(page);
      this.pages.update((pages) => [
        page,
        ...pages.filter((other) => other.city !== page.city),
      ]);
      await this.toast(successKey, 'success');

      return page;
    } catch (error) {
      console.error(`${failureKey}:`, error);
      await this.toast(failureKey, 'failure', error);

      return undefined;
    } finally {
      this.busy.set(false);
    }
  }

  private async toast(
    messageKey: string,
    outcome: 'success' | 'failure',
    error?: unknown,
  ): Promise<void> {
    // The callable's own message says which rule refused the page - "needs
    // 3 to 5 Bites", "These Bites cannot be shown: b9" - which is the one
    // thing the operator needs to fix it.
    const detail = error instanceof Error ? error.message : '';

    await this.toastService.present({
      messageKey,
      outcome,
      params: { detail },
    });
  }
}
