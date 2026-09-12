import { expect, Locator, Page } from '@playwright/test';

/**
 * The statuses this suite names, spelled out rather than imported from
 * `libs/bite-tribe-common/model`.
 *
 * An end-to-end suite asserts what the running app shows, and a name taken
 * from the same constant the app renders from would agree with it by
 * construction - including when both are wrong. The model's own exhaustiveness
 * is tested in `table-state.spec.ts`.
 */
type TableStatus =
  | 'available'
  | 'reserved'
  | 'occupied'
  | 'ordering'
  | 'awaitingPayment'
  | 'cleaning'
  | 'disabled';

/**
 * Page object for the live table view
 * (route: `/restaurant/:restaurantId/tables`).
 *
 * Two things about this page decide how everything below is written.
 *
 * It never writes. There is no save, no publish and no action - issue \#1094
 * adds the transitions - so every helper here reads, and the one thing a
 * journey *does* to change the room is write a state document straight to the
 * emulator and watch the page notice.
 *
 * And the plan is an SVG in room millimetres rather than a list. A table is
 * addressed by the `data-item-id` the canvas puts on its group, and what a
 * journey can assert about it is its number, the colour it is tinted and
 * whether a status silhouette is drawn on it. The status *word* is not on the
 * plan - it is in the summary bar and in the detail panel, which is where
 * {@link countFor} and {@link detail} read it.
 */
export class TablePlanPage {
  readonly page: Page;
  readonly summary: Locator;
  readonly live: Locator;
  readonly detail: Locator;
  readonly detailDuration: Locator;
  readonly detailNote: Locator;
  readonly detailClose: Locator;
  readonly roomSwitcher: Locator;
  readonly emptyRoom: Locator;

  constructor(page: Page) {
    this.page = page;
    this.summary = page.getByTestId('table-plan-summary');
    this.live = page.getByTestId('table-plan-live');
    this.detail = page.getByTestId('table-plan-detail');
    this.detailDuration = page.getByTestId('table-plan-detail-duration');
    this.detailNote = page.getByTestId('table-plan-detail-note');
    this.detailClose = page.getByTestId('table-plan-detail-close');
    this.roomSwitcher = page.getByTestId('table-plan-rooms');
    this.emptyRoom = page.getByTestId('table-plan-room-empty');
  }

  async goto(restaurantId: string): Promise<void> {
    await this.page.goto(`/restaurant/${restaurantId}/tables`);
    await expect(this.summary).toBeVisible();
  }

  /** One entry of the summary bar, which is also the status legend. */
  countFor(status: TableStatus): Locator {
    return this.page.getByTestId(`table-plan-count-${status}`);
  }

  /** One table on the plan. */
  table(tableId: string): Locator {
    return this.page.locator(`[data-item-id="${tableId}"]`);
  }

  /** The status silhouette drawn on one table. */
  statusMark(tableId: string): Locator {
    return this.page.getByTestId(`floor-plan-status-${tableId}`);
  }

  /** The time in state drawn on one table, where one is running. */
  duration(tableId: string): Locator {
    return this.page.getByTestId(`floor-plan-duration-${tableId}`);
  }

  /** The capacity drawn on one table, which a running clock replaces. */
  seats(tableId: string): Locator {
    return this.page.getByTestId(`floor-plan-seats-${tableId}`);
  }

  room(roomId: string): Locator {
    return this.page.getByTestId(`table-plan-room-${roomId}`);
  }

  /**
   * Taps a table, which is what puts its detail on screen.
   *
   * A `click` rather than a synthetic drag: the canvas decides on the way *up*
   * whether a press was a tap or a pan, and a click is a press that never
   * travelled.
   */
  async tapTable(tableId: string): Promise<void> {
    await this.table(tableId).click();
    await expect(this.detail).toBeVisible();
  }

  /** How many tables the bar says are in one status. */
  async expectCount(status: TableStatus, count: number): Promise<void> {
    await expect(this.countFor(status)).toContainText(String(count));
  }
}
