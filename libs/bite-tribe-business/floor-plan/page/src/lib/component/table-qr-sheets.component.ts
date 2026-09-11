import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCheckbox,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { TableQrCodeComponent } from 'bite-tribe-business/floor-plan-ui';
import { PageComponent } from 'common/ui/page';
import {
  ALL_ROOMS,
  TableQrSheetLayout,
  TableQrSheetRow,
} from '../integration/table-qr-sheets.service';

/**
 * The printable table codes of one restaurant (GitHub issue \#1087).
 *
 * ## One tree, two media
 *
 * What is on screen and what comes out of the printer are the same elements,
 * relaid by `@media print` in the stylesheet beside this file. A second
 * document built for printing would be a second thing to keep correct, and the
 * one that is wrong is the one nobody looks at until twenty-four stickers come
 * off the printer. It also means `Ctrl`/`Cmd`+`P` gives exactly what the
 * Print button gives.
 *
 * The controls carry `qr-sheets__screen`, which the print stylesheet hides.
 * Everything the printer sees is inside `qr-sheets__sheet`.
 *
 * ## Two layouts, one row
 *
 * A tent is one code per page, for the folded card that stands on a table. A
 * sticker is one cell of a grid, for the sheet of labels an owner peels and
 * walks around the room with. Both draw the same row — a code, the table
 * number, the room, the restaurant — at different sizes, because the thing
 * that changes between them is how far away it is read from, not what it says.
 *
 * ## Why the number is bigger than the restaurant's name
 *
 * A person holding a printed code has to be able to say which table it belongs
 * to without scanning it, and by the time they are holding it they already
 * know which restaurant they are standing in. So the table number is the
 * largest thing on the sheet and the restaurant is the smallest.
 */
@Component({
  selector: 'bt-business-table-qr-sheets',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    TableQrCodeComponent,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonCheckbox,
    IonButton,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    TranslocoPipe,
  ],
  templateUrl: './table-qr-sheets.component.html',
  styleUrl: './table-qr-sheets.component.scss',
})
export class TableQrSheetsComponent {
  readonly restaurantName = input('');
  readonly layout = input<TableQrSheetLayout>('sticker');
  readonly room = input<string>(ALL_ROOMS);
  readonly filterRooms = input<{ id: string; name: string }[]>([]);
  readonly visibleRows = input<TableQrSheetRow[]>([]);
  readonly selectedRows = input<TableQrSheetRow[]>([]);
  readonly selectedIds = input<ReadonlySet<string>>(new Set<string>());
  readonly missingTokenLabels = input<string[]>([]);
  readonly disabledLabels = input<string[]>([]);
  readonly loading = input(false);
  readonly loadFailed = input(false);
  readonly isAuthenticated = input(false);

  readonly layoutChange = output<TableQrSheetLayout>();
  readonly roomChange = output<string>();
  readonly toggleTable = output<string>();
  readonly selectAll = output<boolean>();
  readonly printRequest = output<void>();
  readonly logoutClick = output<void>();

  protected readonly allRooms = ALL_ROOMS;

  protected readonly hasRows = computed(() => this.visibleRows().length > 0);

  /** Nothing ticked is a reachable state, and printing it would waste paper. */
  protected readonly canPrint = computed(() => this.selectedRows().length > 0);

  protected readonly allSelected = computed(
    () =>
      this.hasRows() &&
      this.selectedRows().length === this.visibleRows().length,
  );

  /**
   * Ticked, but not all of them — the indeterminate box.
   *
   * Without it a partial selection renders as unticked, and the header box
   * would claim the owner has selected nothing while nine stickers are queued.
   */
  protected readonly someSelected = computed(
    () => this.selectedRows().length > 0 && !this.allSelected(),
  );

  protected isSelected(tableId: string): boolean {
    return this.selectedIds().has(tableId);
  }

  protected onLayoutChange(value: string | number | undefined): void {
    if (value === 'tent' || value === 'sticker') {
      this.layoutChange.emit(value);
    }
  }

  protected onRoomChange(value: string): void {
    this.roomChange.emit(value);
  }
}
