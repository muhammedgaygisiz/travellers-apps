import { Injectable, computed, inject, signal } from '@angular/core';
import {
  VisitSummaryApiService,
  isTableSessionCallError,
} from 'bite-tribe/api';
import type { VisitSummary, VisitSummaryRefusalReason } from 'model';

/**
 * The meals this account keeps (GitHub issue #1111).
 *
 * ## Why it lives in data-access rather than beside its page
 *
 * The Nx boundaries said so, and they were right. A `type:feature` library may
 * depend on `type:data-access` and not on `type:api`, so a page that called
 * `VisitSummaryApiService` itself put a screen one import away from the
 * transport. This is the library that already owns every other read of a
 * summary, so the list joined them rather than starting a third home for the
 * same documents.
 *
 * ## Why a list and a lookup rather than one call
 *
 * `listVisitSummaries` answers with whole summaries, so the detail screen
 * could have read one out of the list it was navigated from. It does not,
 * because the detail route is addressable: a guest who keeps the link, and the
 * notification issue [#1112] will send, both arrive without a list having been
 * loaded. So the detail fetches its own, and the list is a list.
 *
 * ## Members only, and the empty answer is not an error
 *
 * The backend answers an unregistered caller with an empty list rather than a
 * refusal (`RD-TS-46`): a guest who never registered has at most the one meal
 * they are sitting at, and they reach it from the screen they are already on.
 * So an empty list here means "nothing yet", which is also what it means for a
 * member who has never eaten at a table with a QR code - which today is almost
 * everybody.
 */
@Injectable({ providedIn: 'root' })
export class MyVisitsService {
  private readonly api = inject(VisitSummaryApiService);

  private readonly visits = signal<VisitSummary[]>([]);
  private readonly loading = signal(false);
  private readonly failed = signal(false);
  private readonly loadedOnce = signal(false);

  /** Every meal, newest first. */
  readonly summaries = computed(() => this.visits());

  readonly isLoading = computed(() => this.loading());
  readonly hasFailed = computed(() => this.failed());

  /**
   * Whether to say there is nothing here.
   *
   * Only after a load has actually come back. Before that an empty list is a
   * list that has not arrived, and telling somebody they have eaten nowhere
   * while the call is in flight is the kind of empty state people screenshot.
   */
  readonly isEmpty = computed(
    () => this.loadedOnce() && this.visits().length === 0,
  );

  /**
   * One meal, by its id.
   *
   * Not taken out of {@link summaries}, because the detail route is
   * addressable: a kept link and the notification of issue #1112 both arrive
   * without a list having been loaded. The restaurant and the table go empty -
   * they exist on the callable so an *unregistered* guest can be held to the
   * session they were given at the table, and a caller on that route is a
   * member by definition.
   */
  async readOne(
    visitId: string,
  ): Promise<
    | { ok: true; summary: VisitSummary }
    | { ok: false; reason: VisitSummaryRefusalReason }
  > {
    const result = await this.api.read(visitId, '', '');

    if (isTableSessionCallError(result)) {
      // A call that never landed and a summary that is not there yet are one
      // sentence to the reader: look again in a moment.
      return { ok: false, reason: 'notFound' };
    }

    return result.ok
      ? { ok: true, summary: result.summary }
      : { ok: false, reason: result.reason };
  }

  /** Loads the list, or loads it again. */
  async load(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.failed.set(false);

    try {
      const result = await this.api.list();

      if (isTableSessionCallError(result) || !result.ok) {
        this.failed.set(true);

        return;
      }

      this.visits.set([...result.summaries]);
      this.loadedOnce.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
