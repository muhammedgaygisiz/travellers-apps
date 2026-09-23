import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { VisitSummaryComponent } from 'visit-summary';
import type { TableVisitBillLine, VisitSummary } from 'model';

/**
 * One meal, weeks later (GitHub issue #1111).
 *
 * Addressable on its own, which is the reason it is a route rather than a card
 * that expands in the list: a guest who kept the link arrives here without a
 * list having been loaded, and the notification issue [#1112] will send needs
 * somewhere to send them.
 *
 * The meal itself is the shared `bt-visit-summary`, the same component the
 * table order screen hands the guest the moment staff clear the table. Two
 * renderings of one document would be two chances for what somebody checked at
 * the table to differ from what they keep.
 */
@Component({
  selector: 'bt-visit-detail-page',
  imports: [
    PageComponent,
    VisitSummaryComponent,
    IonContent,
    IonButton,
    IonSpinner,
    TranslocoPipe,
  ],
  templateUrl: './visit-detail.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisitDetailPage {
  readonly summary = input<VisitSummary | undefined>(undefined);
  readonly loading = input(false);
  /** The Transloco key for why it could not be shown, or nothing. */
  readonly refusalKey = input('');

  readonly retry = output<void>();

  /** The dish somebody wants to write about (GitHub issue #1112). */
  readonly createBite = output<TableVisitBillLine>();
}
