import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { currencyCodes } from 'utils';
import type { VisitSummary } from 'model';

/**
 * Every meal this account keeps (GitHub issue #1111).
 *
 * ## What a row says, and what it leaves for the next screen
 *
 * Where, when, and what it came to. Not the dishes: a list whose rows each
 * carry four lines of food is a list nobody scans, and the reason somebody
 * opens this screen is to find *which* evening rather than to read all of
 * them. The dishes are one tap away.
 *
 * ## The empty state is the ordinary state
 *
 * Table ordering needs a restaurant with a floor plan, printed codes and a
 * published menu, so for almost every account this list is empty and will be
 * for a while. It therefore says what would put something in it rather than
 * apologising, and the menu entry that leads here is deliberately not added
 * until there is something to find.
 */
@Component({
  selector: 'bt-my-visits-page',
  imports: [PageComponent, IonContent, IonButton, IonSpinner, TranslocoPipe],
  templateUrl: './my-visits.page.html',
  styleUrl: './my-visits.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyVisitsPage {
  readonly summaries = input<readonly VisitSummary[]>([]);
  readonly loading = input(false);
  readonly failed = input(false);
  readonly empty = input(false);

  readonly openVisit = output<string>();
  readonly retry = output<void>();

  /** The day the meal ended, in the reader's own locale. */
  protected day(summary: VisitSummary): string {
    return new Date(summary.closedAt).toLocaleDateString();
  }

  /** What the table came to, in the currency it was ordered in. */
  protected total(summary: VisitSummary): string {
    const symbol =
      currencyCodes.find((entry) => entry.code === summary.currency)?.symbol ??
      summary.currency;

    return symbol ? `${summary.total} ${symbol}` : `${summary.total}`;
  }
}
