import { expect, Locator, Page } from '@playwright/test';

/**
 * Whether an `ion-button` is closed, and whether it is open.
 *
 * Playwright's own `toBeDisabled` reads the native form-control state, and an
 * `ion-button` is a custom element that renders its `<button>` in a shadow
 * root: the host carries `disabled` and `aria-disabled`, and the matcher calls
 * it enabled either way. The reflected `aria-disabled` is what a person using
 * the page is told, so it is what these assert on.
 */
export const expectIonDisabled = async (
  button: Locator,
  timeout?: number,
): Promise<void> => {
  await expect(button).toHaveAttribute('aria-disabled', 'true', { timeout });
};

export const expectIonEnabled = async (
  button: Locator,
  timeout?: number,
): Promise<void> => {
  await expect(button).not.toHaveAttribute('aria-disabled', 'true', {
    timeout,
  });
};

/** The palette entries a journey places, by the variant in their test id. */
export type FloorPlanVariant = 'table-rectangle' | 'table-round';

/**
 * Page object for the floor-plan editor
 * (route: `/restaurant/:restaurantId/floor-plan`).
 *
 * Three details about this page decide how everything below is written.
 *
 * The room's dimensions are typed in metres and stored in millimetres, and the
 * dimension inputs report on every keystroke (`ionInput`), while the table's
 * number and capacity report on commit (`ionChange`). So the dimension helpers
 * fill and move on, and the table helpers fill and then blur.
 *
 * A palette entry can be dragged *or* activated, and activation places the
 * object in the middle of the view. The journeys activate: a synthetic drag
 * proves the browser's drag implementation, and what these specs are for is
 * the plan that comes out the other end.
 *
 * Nothing here has a save button. Every edit is autosaved into the draft and
 * `Publish plan` is the deliberate action that makes the draft the room, so
 * {@link publish} is what a journey calls where another page object would call
 * a save.
 */
export class FloorPlanPage {
  readonly page: Page;
  readonly empty: Locator;
  readonly createFirstRoom: Locator;
  readonly roomList: Locator;
  readonly roomName: Locator;
  readonly roomWidth: Locator;
  readonly roomHeight: Locator;
  readonly canvas: Locator;
  readonly tableProperties: Locator;
  readonly tableLabel: Locator;
  readonly tableSeats: Locator;
  readonly tableEnabled: Locator;
  readonly publishButton: Locator;
  readonly unpublished: Locator;
  readonly qrCodes: Locator;
  readonly restaurantSummary: Locator;

  constructor(page: Page) {
    this.page = page;
    this.empty = page.getByTestId('floor-plan-empty');
    this.createFirstRoom = page.getByTestId('floor-plan-create-first-room');
    this.roomList = page.getByTestId('floor-plan-room-list');
    this.roomName = page.getByTestId('floor-plan-room-name').locator('input');
    this.roomWidth = page.getByTestId('floor-plan-room-width').locator('input');
    this.roomHeight = page
      .getByTestId('floor-plan-room-height')
      .locator('input');
    this.canvas = page.getByTestId('floor-plan-canvas');
    this.tableProperties = page.getByTestId('floor-plan-table-properties');
    this.tableLabel = page
      .getByTestId('floor-plan-table-label')
      .locator('input');
    this.tableSeats = page
      .getByTestId('floor-plan-table-seats')
      .locator('input');
    this.tableEnabled = page.getByTestId('floor-plan-table-enabled');
    this.publishButton = page.getByTestId('floor-plan-publish');
    this.unpublished = page.getByTestId('floor-plan-unpublished');
    this.qrCodes = page.getByTestId('floor-plan-qr-codes');
    this.restaurantSummary = page.getByTestId('floor-plan-restaurant-summary');
  }

  async goto(restaurantId: string): Promise<void> {
    await this.page.goto(`/restaurant/${restaurantId}/floor-plan`);
    await this.expectLoaded();
  }

  /**
   * Waits for the editor to have finished asking Firestore about the plan.
   *
   * The page loads the rooms and then the open room's draft, and shows a
   * spinner until both have an answer. Either the empty state or the room form
   * is the end of that, so waiting for whichever appears is what keeps an
   * assertion from landing on a page that has not read anything yet.
   */
  async expectLoaded(): Promise<void> {
    await expect(this.empty.or(this.roomList)).toBeVisible({ timeout: 30_000 });
  }

  /** Creates the restaurant's first room, at the editor's default size. */
  async createRoom(): Promise<void> {
    await this.createFirstRoom.click();
    await expect(this.roomList).toBeVisible({ timeout: 20_000 });
    await expect(this.canvas).toBeVisible();
  }

  room(name: string): Locator {
    return this.roomList.getByRole('listitem').filter({ hasText: name });
  }

  /** The room's own fields, in metres, as the owner types them. */
  async setRoom(fields: {
    name?: string;
    width?: number;
    height?: number;
  }): Promise<void> {
    if (fields.name !== undefined) {
      await this.roomName.fill(fields.name);
    }

    if (fields.width !== undefined) {
      await this.roomWidth.fill(String(fields.width));
    }

    if (fields.height !== undefined) {
      await this.roomHeight.fill(String(fields.height));
    }
  }

  /**
   * Places one palette object in the middle of the view.
   *
   * The placed object is selected afterwards, which is what opens the
   * properties cards, so a journey can go straight on to numbering it.
   */
  async place(variant: FloorPlanVariant): Promise<void> {
    const before = await this.selectedItemId();

    await this.page.getByTestId(`floor-plan-place-${variant}`).click();
    await expect(this.tableProperties).toBeVisible();
    // Wait for the new object to be the selected one, and not merely drawn.
    // The properties cards are seeded from the selection, so typing a number
    // before that has happened is typing into a field that is about to be
    // filled in again from the table underneath it.
    await expect
      .poll(() => this.selectedItemId(), { timeout: 10_000 })
      .not.toBe(before);
  }

  /** Which object the canvas currently draws as selected, if any. */
  private async selectedItemId(): Promise<string | null> {
    const selected = this.canvas
      .locator('.floor-plan-canvas__item--selected')
      .first();

    return (await selected.count()) > 0
      ? selected.getAttribute('data-item-id')
      : null;
  }

  /**
   * Nudges the selection with the arrow keys, one landed press at a time.
   *
   * One press is one grid cell while snapping is on, so this is also how a
   * journey separates two objects it placed at the same point. `press` focuses
   * the canvas first, and the canvas only pans when nothing is selected.
   *
   * Each press waits for the plan to have actually moved before the next one.
   * The canvas computes a nudge from the items it was last given, so two
   * presses sent back to back can both be answered from the same position and
   * only one of them lands — which a person pressing an arrow key twice never
   * sees, and a runner sending two keystrokes a few milliseconds apart sees
   * about one run in three.
   */
  async nudgeSelection(
    key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown',
    times = 1,
  ): Promise<void> {
    for (let step = 0; step < times; step += 1) {
      const before = await this.selectedGeometry();

      await this.canvas.press(key);
      await expect
        .poll(() => this.selectedGeometry(), { timeout: 10_000 })
        .not.toBe(before);
    }
  }

  /**
   * Where the selected shape is drawn, as the canvas has it right now.
   *
   * Read off the SVG rather than from the store because it is the round trip
   * that has to have happened: the editor owns the plan and hands it back to
   * the canvas, so a moved shape is proof the edit landed rather than proof
   * the keystroke arrived. A rectangle carries `x`/`y` and a circle `cx`/`cy`.
   */
  private async selectedGeometry(): Promise<string> {
    return this.canvas
      .locator('.floor-plan-canvas__item--selected')
      .first()
      .locator('rect, circle')
      .first()
      .evaluate(
        (shape) =>
          `${shape.getAttribute('x') ?? shape.getAttribute('cx')},${
            shape.getAttribute('y') ?? shape.getAttribute('cy')
          }`,
      );
  }

  /**
   * The selected table's public number, committed on blur.
   *
   * The field is read back afterwards, which is both a barrier and an
   * assertion. A barrier because the editor answers an accepted number by
   * rewriting the panel from the table it just changed, and the next keystroke
   * has to land after that rather than into a field about to be replaced. An
   * assertion because a *refused* number - one another table in the
   * restaurant already holds - leaves the table's own number standing, and the
   * panel then shows that instead of what was typed.
   */
  async setTableLabel(label: string): Promise<void> {
    await this.tableLabel.fill(label);
    await this.tableLabel.blur();
    await expect(this.tableLabel).toHaveValue(label);
  }

  /** The selected table's seating capacity, committed and read back. */
  async setTableSeats(seats: number): Promise<void> {
    await this.tableSeats.fill(String(seats));
    await this.tableSeats.blur();
    await expect(this.tableSeats).toHaveValue(String(seats));
  }

  /** Takes the selected table out of service, or puts it back in. */
  async toggleTableInService(): Promise<void> {
    await this.tableEnabled.click();
  }

  /**
   * One object as the canvas draws it, found by what it announces.
   *
   * The accessible name is the assertion: issue \#1089 made every shape name
   * what it is, and for a table that is its number, its capacity and whether
   * it is in service — which is exactly what a journey wants to check survived
   * a publish and a reload. Matched as the attribute rather than through the
   * accessible name, because these are `<g>` elements in an SVG and the name
   * is the only thing on them a test should depend on.
   */
  item(name: string): Locator {
    return this.canvas.locator(`[data-item-id][aria-label="${name}"]`);
  }

  /** Every drawn object of the open room, whatever it is. */
  get items(): Locator {
    return this.canvas.locator('[data-item-id]');
  }

  /**
   * Publishes the plan and waits for the success toast.
   *
   * The button opens a confirmation naming what would change, because
   * publishing overwrites the plan staff and a scanned code read. The alert's
   * confirm button carries the same copy as the button that opened it.
   */
  async publish(): Promise<void> {
    await expectIonEnabled(this.publishButton, 20_000);
    await this.publishButton.click();

    const alert = this.page.locator('ion-alert');
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: 'Publish plan' }).click();

    await expect(
      this.page
        .locator('ion-toast')
        .getByText('Plan published. Staff and QR codes now read it.', {
          exact: true,
        }),
    ).toBeVisible({ timeout: 20_000 });
  }

  /**
   * Asserts that what is on screen is what is published.
   *
   * The note is rendered whenever the editor's plan differs from the stored
   * one, draft included, so its absence is the page's own statement that the
   * reload came back with the plan that was published. The Print QR codes
   * button is closed by the same condition, so it is checked here too: a
   * published plan is one whose tables have codes.
   */
  async expectEverythingPublished(): Promise<void> {
    await expect(this.unpublished).toHaveCount(0, { timeout: 20_000 });
    await expectIonEnabled(this.qrCodes);
  }

  async openQrCodes(restaurantId: string): Promise<void> {
    await this.qrCodes.click();
    await this.page.waitForURL(
      `**/restaurant/${restaurantId}/floor-plan/qr-codes`,
    );
  }
}
