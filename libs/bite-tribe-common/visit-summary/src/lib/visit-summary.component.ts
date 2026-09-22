import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { currencyCodes } from 'utils';
import type { TableVisitBillLine, VisitSummary } from 'model';

/**
 * The symbol for a currency code, or the code itself where none is known.
 *
 * A copy of the one on the table order screen rather than an import from it:
 * that screen is a `type:feature` library and this is `type:ui`, so the
 * dependency would run the wrong way through the boundaries. Four lines are a
 * cheaper duplicate than a shared library nothing else would ever join.
 */
const symbolOf = (code: string): string => {
  if (!code) {
    return '';
  }

  return currencyCodes.find((entry) => entry.code === code)?.symbol ?? code;
};

/**
 * What a guest ate, rendered (GitHub issue #1111).
 *
 * ## Why this is its own library
 *
 * Two screens show it: the table order screen, where the guest is handed it
 * the moment staff clear the table, and the visits page, where they find it
 * again weeks later. Both are `type:feature` libraries, and a feature may not
 * depend on another feature - so the markup they share lives in a `type:ui`
 * library beside `bite-tribe-common/bite` and `opening-hours`, which exist for
 * the same reason.
 *
 * ## It renders and decides nothing
 *
 * No fetch, no refusal handling, no email. Those differ between the two
 * screens - the table screen asks for an address and the history screen does
 * not - and a component that owned them would be a component with a mode. What
 * is common is the meal: where, what, how much, and whether the restaurant
 * recorded a payment.
 *
 * ## It is a summary and never a receipt
 *
 * `ADR-0004`, `RD-TS-46`. The footnote saying so is part of the component
 * rather than of either screen, because it is a property of the document and
 * not of where the document is being read. A screen that forgot it would be
 * the one place BiteTribe implied it had taken the money.
 */
@Component({
  selector: 'bt-visit-summary',
  imports: [IonButton, TranslocoPipe],
  templateUrl: './visit-summary.component.html',
  styleUrl: './visit-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisitSummaryComponent {
  readonly summary = input.required<VisitSummary>();

  /**
   * Whether to print the sentence about what this document is not.
   *
   * On by default and off where the screen already says it once. Two copies of
   * it on one page reads as a disclaimer somebody was nervous about rather
   * than as the plain fact it is.
   */
  readonly showsFootnote = input(true);

  /**
   * Whether each dish offers to become a Bite (GitHub issue #1112).
   *
   * Off by default, because the component renders a document and a Bite is an
   * action on it. The screens that turn it on are the ones a member reaches:
   * an anonymous guest is asked to register first, and a row offering
   * something that bounces them at the next screen would be a worse answer
   * than not offering it.
   */
  readonly offersBite = input(false);

  /**
   * The dish somebody wants to write about.
   *
   * The line rather than its index, because what the next screen needs is the
   * name, the price and the currency - and an index into a list the parent
   * also holds is a second way to get them wrong.
   */
  readonly createBite = output<TableVisitBillLine>();

  /** Whether the table ordered nothing at all. */
  protected readonly isEmpty = computed(
    () => this.summary().lines.length === 0,
  );

  /** One row's dish, with its variant where it has one. */
  protected lineName(line: TableVisitBillLine): string {
    return line.variantName ? `${line.name} - ${line.variantName}` : line.name;
  }

  /** The extras on a row, as one readable string. */
  protected lineExtras(line: TableVisitBillLine): string {
    return (line.extras ?? []).map((extra) => extra.name).join(', ');
  }

  /** A price in the currency the meal was ordered in. */
  protected price(amount: number): string {
    const symbol = symbolOf(this.summary().currency);

    return symbol ? `${amount} ${symbol}` : `${amount}`;
  }
}
