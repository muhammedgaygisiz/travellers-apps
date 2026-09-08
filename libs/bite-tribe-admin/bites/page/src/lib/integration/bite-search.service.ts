import { computed, inject, Injectable, signal } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { ToastService } from 'toast';
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
  private readonly toastService = inject(ToastService);

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

  /**
   * The Bite currently being deleted, if any.
   *
   * Held as an id rather than a boolean so the button that is spinning is the
   * one whose Bite is going, and a second selection mid-delete cannot make a
   * different Bite look like the one under way.
   */
  private readonly deletingId = signal<string | undefined>(undefined);

  readonly deleting = computed(() => this.deletingId() !== undefined);

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

  /**
   * Deletes a Bite that should not be on BiteTribe.
   *
   * The Bite is dropped from the results rather than the search being re-run.
   * Re-running would send a second collection scan through the callable to
   * confirm what this call already knows, and would clear the term the operator
   * is still working through if they were given several Bites to look at.
   *
   * The selection is resolved out of the results, so removing the Bite empties
   * the detail column on its own — there is nothing left to show, which is the
   * point of the action.
   */
  async deleteBite(biteId: string, reason: string): Promise<void> {
    this.deletingId.set(biteId);

    try {
      await this.dataAccess.deleteBite(biteId, reason);
      this.found.update((bites) => bites.filter((bite) => bite.id !== biteId));
      await this.toastService.present({
        messageKey: 'admin-bites-deleted',
        outcome: 'success',
      });
    } catch (error) {
      console.error('Failed to delete the Bite:', error);
      await this.toastService.present({
        messageKey: 'admin-bites-delete-failed',
        outcome: 'failure',
      });
    } finally {
      this.deletingId.set(undefined);
    }
  }

  logout(): void {
    this.storeService.logout();
  }
}
