import { Injectable, computed, inject, signal } from '@angular/core';
import {
  VisitSummaryApiService,
  isTableSessionCallError,
  type TableSessionCallFailure,
} from 'bite-tribe/api';
import type {
  VisitSummary,
  VisitSummaryEmailRefusalReason,
  VisitSummaryRefusalReason,
} from 'model';

/**
 * The sentence each refusal is told with.
 *
 * `notFound` is the one worth reading twice. It is also the answer in the
 * second after a close, before the trigger has written the summary - so the
 * sentence says the summary is being prepared rather than that there is none,
 * and the screen offers another look. A guest whose meal has just ended and is
 * told "nothing here" would reasonably conclude the restaurant lost it.
 */
export const VISIT_SUMMARY_REFUSAL_KEYS: Readonly<
  Record<VisitSummaryRefusalReason, string>
> = {
  notFound: 'visit-summary-preparing',
  sessionExpired: 'visit-summary-expired',
} as const;

/** The sentence each failed send is told with. */
export const VISIT_SUMMARY_EMAIL_REFUSAL_KEYS: Readonly<
  Record<VisitSummaryEmailRefusalReason, string>
> = {
  notFound: 'visit-summary-preparing',
  sessionExpired: 'visit-summary-expired',
  alreadySent: 'visit-summary-email-already-sent',
  invalidAddress: 'visit-summary-email-invalid',
  sendFailed: 'visit-summary-email-failed',
} as const;

/**
 * What the guest ate, once the table has been cleared (GitHub issue #1111).
 *
 * ## Fetched, and re-fetchable
 *
 * There is nothing to listen to: the visit has ended and the summary is
 * written once. What makes this more than a single call is that it can arrive
 * *before* the summary exists - the trigger that writes it runs after the
 * close rather than inside it, so the first read can legitimately answer
 * `notFound`. The screen says it is being prepared and offers another look,
 * which is the whole of how an eventual write is made honest to somebody
 * standing up from a table.
 *
 * ## The address is held for one call and dropped
 *
 * `RD-TS-46`. It is handed to the backend, used for the send, and stored
 * nowhere - not on the account, not on the summary, and not here. The signal
 * that carried it is cleared as the call is made rather than when it returns,
 * so a failed send leaves nothing behind either.
 */
@Injectable()
export class VisitSummaryService {
  private readonly api = inject(VisitSummaryApiService);

  private readonly read = signal<VisitSummary | undefined>(undefined);
  private readonly refusal = signal<VisitSummaryRefusalReason | undefined>(
    undefined,
  );
  private readonly failure = signal<TableSessionCallFailure | undefined>(
    undefined,
  );
  private readonly loading = signal(false);

  private readonly sending = signal(false);
  private readonly sent = signal(false);
  private readonly emailRefusal = signal<
    VisitSummaryEmailRefusalReason | undefined
  >(undefined);
  private readonly emailFailure = signal<TableSessionCallFailure | undefined>(
    undefined,
  );

  /** Which visit is being shown, set by {@link watch}. */
  private watching?: {
    visitId: string;
    restaurantId: string;
    tableId: string;
  };

  /** Which visit is being shown, as a signal the screen can ask. */
  private readonly visit = signal<string | undefined>(undefined);

  /**
   * Whether there is a closed visit to show a summary for at all.
   *
   * The screen's one question. It is true from the moment the session reports
   * the visit closed, which is before the first fetch - so the section can
   * offer the look rather than appearing only once something has been looked
   * at.
   */
  readonly hasVisit = computed(() => this.visit() !== undefined);

  /** The meal, once it has been fetched. */
  readonly summary = computed(() => this.read());

  readonly isLoading = computed(() => this.loading());
  readonly lastRefusal = computed(() => this.refusal());
  readonly lastFailure = computed(() => this.failure());

  /** Whether the summary exists but has not been written yet. */
  readonly isPreparing = computed(() => this.refusal() === 'notFound');

  readonly isSending = computed(() => this.sending());
  readonly isSent = computed(
    () => this.sent() || this.read()?.emailedAt !== undefined,
  );
  readonly lastEmailRefusal = computed(() => this.emailRefusal());
  readonly lastEmailFailure = computed(() => this.emailFailure());

  /** Whether the guest has anything on the bill at all. */
  readonly isEmpty = computed(() => (this.read()?.lines.length ?? 0) === 0);

  /** Points the service at one closed visit, dropping the last one. */
  watch(visitId: string, restaurantId: string, tableId: string): void {
    if (this.watching?.visitId === visitId) {
      return;
    }

    this.watching = { visitId, restaurantId, tableId };
    this.clear();
    this.visit.set(visitId);
  }

  /** Fetches the meal, or fetches it again while the trigger catches up. */
  async load(): Promise<void> {
    const watching = this.watching;

    if (!watching || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.refusal.set(undefined);
    this.failure.set(undefined);

    try {
      const result = await this.api.read(
        watching.visitId,
        watching.restaurantId,
        watching.tableId,
      );

      if (isTableSessionCallError(result)) {
        this.failure.set(result.failure);

        return;
      }

      if (!result.ok) {
        this.refusal.set(result.reason);

        return;
      }

      this.read.set(result.summary);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Sends the summary to one address, once.
   *
   * The address is taken as an argument and never held: the caller reads it
   * off a field, hands it over, and clears the field. Nothing in this service
   * has a place to put it.
   */
  async email(address: string): Promise<void> {
    const watching = this.watching;

    if (!watching || this.sending() || this.isSent()) {
      return;
    }

    this.sending.set(true);
    this.emailRefusal.set(undefined);
    this.emailFailure.set(undefined);

    try {
      const result = await this.api.email(watching.visitId, address);

      if (isTableSessionCallError(result)) {
        this.emailFailure.set(result.failure);

        return;
      }

      if (!result.ok) {
        this.emailRefusal.set(result.reason);

        return;
      }

      this.sent.set(true);
    } finally {
      this.sending.set(false);
    }
  }

  /** Drops everything, so the next visit starts from nothing. */
  clear(): void {
    this.read.set(undefined);
    this.refusal.set(undefined);
    this.failure.set(undefined);
    this.loading.set(false);
    this.sending.set(false);
    this.sent.set(false);
    this.emailRefusal.set(undefined);
    this.emailFailure.set(undefined);
  }
}
