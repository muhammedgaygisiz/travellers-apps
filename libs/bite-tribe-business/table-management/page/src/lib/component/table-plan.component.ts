import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import {
  IonBadge,
  IonButton,
  IonContent,
  IonIcon,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  FloorPlanCanvasComponent,
  FloorPlanItem,
  tableStatusGlyphPath,
  tableStatusMark,
  withAlpha,
  STATUS_TINT_ALPHA,
} from 'bite-tribe-business/floor-plan-ui';
import { PageComponent } from 'common/ui/page';
import { Room, TableStatus } from 'model';
import { TableAction, TableActionRequest } from '../integration/table-actions';
import { TableDetail } from '../integration/table-plan.service';
import { TableStatusCount } from '../integration/table-plan-summary';
import { TableActionsComponent } from './table-actions.component';

/** The size the summary chip's glyph is drawn at, in its own tiny viewBox. */
const CHIP_GLYPH_BOX = 16;
const CHIP_GLYPH_SIZE = 10;
const CHIP_GLYPH_STROKE = 2;

/** One entry of the summary bar, ready to draw. */
interface SummaryChip {
  status: TableStatus;
  count: number;
  labelKey: string;
  colour: string;
  tint: string;
  glyphPath: string;
  glyphFill: string;
  strokeWidth: number;
  viewBox: string;
}

/**
 * The room as it stands during service (GitHub issue #1093).
 *
 * ## Why this is a different page from the editor
 *
 * The editor of issue #1085 is locked to a desktop width, because an owner
 * laying out twenty tables to the millimetre is sitting at a desk. Nobody
 * during a service is. A host greeting guests has a tablet in one hand, a
 * waiter checking whether table 6 has paid has a phone in an apron pocket, and
 * neither of them is arranging anything. So this is the floor-plan surface that
 * carries a small screen, and its layout collapses to one column rather than
 * scrolling sideways: the plan first, because it is the reason the page was
 * opened, and the room's totals above it where they are read before looking
 * down.
 *
 * ## Never colour alone
 *
 * Every status is said three ways - a colour, a silhouette and the word -
 * wherever it appears, on the plan and in this bar and in the detail. Only the
 * last two survive greyscale and a colour-vision deficiency, which is what the
 * acceptance criterion asks for, so the glyph is drawn in the summary chips too
 * rather than leaving them as coloured dots.
 */
@Component({
  selector: 'bt-business-table-plan',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    FloorPlanCanvasComponent,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonBadge,
    IonButton,
    IonIcon,
    IonNote,
    IonSpinner,
    TranslocoPipe,
    TableActionsComponent,
  ],
  templateUrl: './table-plan.component.html',
  styleUrl: './table-plan.component.scss',
})
export class TablePlanComponent {
  readonly rooms = input<Room[]>([]);
  readonly selectedRoom = input<Room | undefined>(undefined);
  readonly restaurantName = input('');
  readonly loading = input(false);
  readonly loadFailed = input(false);
  /** Whether the states on screen have been confirmed by the server. */
  readonly isLive = input(false);
  readonly items = input<FloorPlanItem[]>([]);
  readonly selectedIds = input<readonly string[]>([]);
  readonly summary = input<TableStatusCount[]>([]);
  readonly roomTableCount = input(0);
  readonly selectedTable = input<TableDetail | undefined>(undefined);
  /** The table whose action sheet is open, or nothing (GitHub issue #1094). */
  readonly actionTarget = input<TableDetail | undefined>(undefined);
  /** What that table may be asked to do, already filtered to the legal moves. */
  readonly actions = input<TableAction[]>([]);
  /** Whether taps are assembling an end-of-service batch. */
  readonly bulkMode = input(false);
  readonly selectedCount = input(0);
  /** How many of the selected tables the reset would actually free. */
  readonly freeableCount = input(0);
  readonly bulkBusy = input(false);
  readonly isAuthenticated = input(false);

  readonly selectRoom = output<string>();
  readonly selectionChange = output<string[]>();
  readonly activateTable = output<string>();
  readonly clearSelection = output<void>();
  readonly actionPicked = output<TableActionRequest>();
  readonly actionsDismissed = output<void>();
  readonly bulkModeToggled = output<void>();
  readonly selectAllRequested = output<void>();
  readonly freeSelected = output<void>();
  readonly logoutClick = output<void>();

  private readonly canvasHost =
    viewChild<ElementRef<HTMLElement>>('canvasHost');

  readonly hasRooms = computed(() => this.rooms().length > 0);

  /**
   * The summary bar.
   *
   * The glyph is rebuilt here in its own little viewBox rather than reusing the
   * one on the plan, because that one is drawn in room millimetres at whatever
   * the viewport currently is. A chip is 16 units square and always will be.
   */
  readonly chips = computed<SummaryChip[]>(() =>
    this.summary().map(({ status, count }) => {
      const mark = tableStatusMark(status);
      const centre = CHIP_GLYPH_BOX / 2;

      return {
        status,
        count,
        labelKey: mark.labelKey,
        colour: mark.colour,
        tint: withAlpha(mark.colour, STATUS_TINT_ALPHA),
        glyphPath: tableStatusGlyphPath(
          mark.glyph,
          centre,
          centre,
          CHIP_GLYPH_SIZE,
        ),
        glyphFill: mark.filled ? mark.colour : 'none',
        strokeWidth: CHIP_GLYPH_STROKE,
        viewBox: `0 0 ${CHIP_GLYPH_BOX} ${CHIP_GLYPH_BOX}`,
      };
    }),
  );

  /** The detail's own mark, so the panel says the status the plan's way too. */
  readonly detailMark = computed(() => {
    const detail = this.selectedTable();

    if (!detail) {
      return undefined;
    }

    const mark = tableStatusMark(detail.status);
    const centre = CHIP_GLYPH_BOX / 2;

    return {
      colour: mark.colour,
      glyphPath: tableStatusGlyphPath(
        mark.glyph,
        centre,
        centre,
        CHIP_GLYPH_SIZE,
      ),
      glyphFill: mark.filled ? mark.colour : 'none',
      strokeWidth: CHIP_GLYPH_STROKE,
      viewBox: `0 0 ${CHIP_GLYPH_BOX} ${CHIP_GLYPH_BOX}`,
    };
  });

  onSelectRoom(roomId: string | undefined): void {
    if (roomId && roomId !== this.selectedRoom()?.id) {
      this.selectRoom.emit(roomId);
    }
  }

  /**
   * Closing the sheet puts focus back where it came from.
   *
   * The plan is a single tab stop driven by `aria-activedescendant`, so a
   * keyboard user who pressed enter on table 6 and then escape has nothing
   * focused unless it is handed back - the next tab would start again from the
   * top of the page, and the table they were standing on is forgotten.
   */
  onActionsDismissed(): void {
    this.actionsDismissed.emit();
    this.canvasHost()
      ?.nativeElement.querySelector<HTMLElement>('[tabindex]')
      ?.focus();
  }
}
