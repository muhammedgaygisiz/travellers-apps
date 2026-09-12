import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  tableStatusGlyphPath,
  tableStatusMark,
} from 'bite-tribe-business/floor-plan-ui';
import { TableAction, TableActionRequest } from '../integration/table-actions';
import { TableDetail } from '../integration/table-plan.service';

/** The size the glyphs are drawn at, in their own square viewBox. */
const GLYPH_BOX = 16;
const GLYPH_SIZE = 10;
const GLYPH_STROKE = 2;

/** The guest counts a stepper is a sensible way to reach. */
export const MIN_GUESTS = 1;
export const MAX_GUESTS = 20;

/** One action, with the mark that says where it leads. */
interface ActionButton extends TableAction {
  colour: string;
  glyphPath: string;
  glyphFill: string;
  strokeWidth: number;
  viewBox: string;
}

/** Unique ids, so two sheets on one page cannot share a label. */
let instance = 0;

/**
 * The sheet a staff member acts from (GitHub issue #1094).
 *
 * ## Why the actions are not a menu
 *
 * Nobody during a service navigates. The sheet is one screenful of buttons,
 * each one a whole action, reached by holding a table or pressing enter on it -
 * so seating a party is the table and then the button, and there is no third
 * step to get lost in. That is the acceptance criterion about one interaction,
 * and it is also why the guest count is a stepper *beside* the seat button
 * rather than a step in front of it: a count nobody entered must never be the
 * thing standing between a host and a seated party.
 *
 * ## Why it holds no rules
 *
 * The list of buttons is given to it. Which transitions are legal is the
 * matrix's answer (issue #1091) and `tableActions` derives the buttons from
 * it, so a sheet cannot offer a move the backend would refuse - the criterion
 * that disallowed transitions are not offered rather than offered and then
 * rejected. This component decides how they look and how a keyboard moves
 * through them, and nothing else.
 *
 * ## Native buttons rather than `ion-button`
 *
 * Because this is a dialog and a dialog has to hold focus. Trapping tab means
 * enumerating what is focusable and calling `focus()` on it, and an
 * `ion-button` is a custom element delegating to a button inside its shadow
 * root - reachable by a keyboard on its own, but not something a query for
 * `button` finds or a `focus()` call lands on reliably. Four native buttons
 * styled to match cost less than a focus trap that works on most of them.
 */
@Component({
  selector: 'bt-business-table-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, TranslocoPipe],
  templateUrl: './table-actions.component.html',
  styleUrl: './table-actions.component.scss',
})
export class TableActionsComponent {
  /** The table being acted on, exactly as the detail panel describes it. */
  readonly table = input.required<TableDetail>();

  /** What it may be asked to do, already filtered to the legal moves. */
  readonly actions = input<TableAction[]>([]);

  readonly actionPicked = output<TableActionRequest>();
  readonly dismissed = output<void>();

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  readonly titleId = `table-actions-title-${(instance += 1)}`;

  /**
   * The party size, or nothing while none has been entered.
   *
   * Reset whenever the sheet turns to another table, because a count is about
   * the party in front of the host and not about the sheet. `linkedSignal`
   * rather than an effect: the source is the table's identity, so the reset is
   * part of reading the signal instead of a write racing the first render.
   */
  readonly guests = linkedSignal<string, number | undefined>({
    source: () => this.table().table.id,
    computation: () => undefined,
  });

  /** Whether a party can be seated at all, which is what the count is for. */
  readonly seatable = computed(() =>
    this.actions().some((action) => action.seating),
  );

  readonly buttons = computed<ActionButton[]>(() =>
    this.actions().map((action) => {
      const mark = tableStatusMark(action.to);
      const centre = GLYPH_BOX / 2;

      return {
        ...action,
        colour: mark.colour,
        glyphPath: tableStatusGlyphPath(mark.glyph, centre, centre, GLYPH_SIZE),
        glyphFill: mark.filled ? mark.colour : 'none',
        strokeWidth: GLYPH_STROKE,
        viewBox: `0 0 ${GLYPH_BOX} ${GLYPH_BOX}`,
      };
    }),
  );

  /** The status the table is in, drawn the plan's way. */
  readonly currentMark = computed(() => {
    const mark = tableStatusMark(this.table().status);
    const centre = GLYPH_BOX / 2;

    return {
      colour: mark.colour,
      glyphPath: tableStatusGlyphPath(mark.glyph, centre, centre, GLYPH_SIZE),
      glyphFill: mark.filled ? mark.colour : 'none',
      strokeWidth: GLYPH_STROKE,
      viewBox: `0 0 ${GLYPH_BOX} ${GLYPH_BOX}`,
    };
  });

  constructor() {
    /*
     * The first action takes focus as the sheet opens.
     *
     * Without it a keyboard user who pressed enter on a table is left with
     * focus still on the canvas behind an open dialog, where the next tab goes
     * to whatever follows the plan on the page rather than into the sheet. The
     * effect runs when the view query resolves, which is the moment the panel
     * exists.
     */
    effect(() => {
      this.focusable()[0]?.focus();
    });
  }

  /** Every button inside the panel, in document order. */
  private focusable(): HTMLButtonElement[] {
    const panel = this.panel()?.nativeElement;

    return panel
      ? Array.from(panel.querySelectorAll<HTMLButtonElement>('button'))
      : [];
  }

  pick(action: TableAction): void {
    const guests = this.guests();

    this.actionPicked.emit({
      to: action.to,
      // The count belongs to seating alone. Marking a table cleaning with
      // "4 guests" recorded against it would put a party in the audit trail
      // that never sat down.
      ...(action.seating && guests !== undefined ? { guests } : {}),
    });
  }

  moreGuests(): void {
    this.guests.update((current) =>
      current === undefined ? MIN_GUESTS : Math.min(current + 1, MAX_GUESTS),
    );
  }

  /** One fewer, and below the smallest party there is no count at all. */
  fewerGuests(): void {
    this.guests.update((current) =>
      current === undefined || current <= MIN_GUESTS ? undefined : current - 1,
    );
  }

  /**
   * Escape closes, and tab stays inside.
   *
   * A dialog that lets tab walk out of it is a dialog a keyboard user cannot
   * tell they are still in: the buttons behind it are reachable, they act on
   * the plan underneath, and nothing says the sheet is open. The wrap is two
   * cases because the browser has already decided where focus is going by the
   * time the event is seen - the edges are the only places worth taking it
   * back.
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      // Stopped so the canvas behind does not also read it as "clear the
      // selection", which would empty the detail panel the sheet was opened
      // from.
      event.stopPropagation();
      this.dismissed.emit();

      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusable = this.focusable();
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!first || !last) {
      return;
    }

    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
