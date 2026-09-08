import { computed, inject, Injectable, signal } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { SearchBite } from 'model';
import { BiteSearchDataAccessService } from 'bite-tribe-admin/bites-data-access';

/**
 * Runs the operator's Bite lookup and holds what it found.
 *
 * The selection is resolved out of the results rather than kept as its own
 * copy, so a second search cannot leave the detail column showing a Bite that
 * is no longer in the list it was picked from.
 */
@Injectable({ providedIn: 'root' })
export class BiteSearchService {
  private readonly dataAccess = inject(BiteSearchDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);

  private readonly found = signal<SearchBite[]>([]);
  private readonly selectedId = signal<string | undefined>(undefined);

  readonly searching = signal(false);

  /**
   * Whether a search has run at all.
   *
   * An empty list before the first search and an empty list after one mean
   * different things — "type something" and "nothing matched" — and the page
   * has no other way to tell them apart.
   */
  readonly searched = signal(false);

  /**
   * Whether the last search failed.
   *
   * Surfaced rather than swallowed. The consumer app's search resource catches
   * every failure and renders an empty list, which is tolerable when the cost
   * is a missing suggestion. Here it would tell an operator that a reported
   * Bite does not exist.
   */
  readonly failed = signal(false);

  readonly results = computed<SearchBite[]>(() => this.found());

  readonly selected = computed<SearchBite | undefined>(() => {
    const id = this.selectedId();

    return id ? this.found().find((bite) => bite.id === id) : undefined;
  });

  async search(searchText: string): Promise<void> {
    this.searching.set(true);
    this.failed.set(false);
    this.selectedId.set(undefined);

    try {
      this.found.set(await this.dataAccess.search(searchText));
    } catch (error) {
      console.error('Failed to search for Bites:', error);
      this.found.set([]);
      this.failed.set(true);
    } finally {
      this.searched.set(true);
      this.searching.set(false);
    }
  }

  select(bite: SearchBite): void {
    this.selectedId.set(bite.id);
  }

  logout(): void {
    this.storeService.logout();
  }
}
