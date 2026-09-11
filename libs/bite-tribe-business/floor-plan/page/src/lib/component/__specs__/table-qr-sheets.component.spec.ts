import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TableQrSheetRow } from '../../integration/table-qr-sheets.service';
import { TableQrSheetsComponent } from '../table-qr-sheets.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

const row = (over: Partial<TableQrSheetRow> = {}): TableQrSheetRow => ({
  tableId: 'table-1',
  label: '12',
  roomId: 'room-1',
  roomName: 'Main dining room',
  token: '7K3QMXB2VZ0HNDR5TWY9FC8AJP',
  ...over,
});

const ROWS = [
  row(),
  row({ tableId: 'table-2', label: '13', token: 'QZ5V8T2W7YRNJ0HDBM3XKC9FPA' }),
];

/** `count` rows, each with its own id, for the pagination assertions. */
const manyRows = (count: number): TableQrSheetRow[] =>
  Array.from({ length: count }, (_, index) =>
    row({ tableId: `table-${index + 1}`, label: `${index + 1}` }),
  );

describe(TableQrSheetsComponent.name, () => {
  let component: TableQrSheetsComponent;
  let fixture: ComponentFixture<TableQrSheetsComponent>;
  let ref: ComponentRef<TableQrSheetsComponent>;

  const setInputs = (inputs: Record<string, unknown>): void => {
    Object.entries(inputs).forEach(([key, value]) => ref.setInput(key, value));
    fixture.detectChanges();
  };

  const query = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  /**
   * An Ionic button's own `disabled` input, read off the component: an
   * `ion-button` is not upgraded in jsdom, so the attribute it first rendered
   * with stays on the element after the binding turns it off again.
   */
  const buttonDisabled = (testId: string): boolean =>
    fixture.debugElement.query(By.css(`[data-testid="${testId}"]`))
      .componentInstance.disabled;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableQrSheetsComponent],
      providers: [
        provideIonicAngular(),
        {
          provide: TranslocoService,
          useValue: {
            translate: (key: string): string => key,
          },
        },
      ],
    })
      .overrideComponent(TableQrSheetsComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TableQrSheetsComponent);
    ref = fixture.componentRef;
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  describe('what reaches the paper', () => {
    it('draws one code per selected table', () => {
      setInputs({ visibleRows: ROWS, selectedRows: ROWS });

      expect(
        fixture.nativeElement.querySelectorAll('[data-testid="table-qr-code"]'),
      ).toHaveLength(2);
    });

    it('prints only the selection, not everything visible', () => {
      setInputs({ visibleRows: ROWS, selectedRows: [ROWS[0]] });

      expect(query('qr-sheets-code-table-1')).not.toBeNull();
      expect(query('qr-sheets-code-table-2')).toBeNull();
    });

    it('names the table, the room and the restaurant beside the code', () => {
      // The acceptance criterion that a person holding a printed code can tell
      // which table it belongs to without scanning it.
      setInputs({
        restaurantName: 'Sakura Kitchen',
        visibleRows: [ROWS[0]],
        selectedRows: [ROWS[0]],
      });

      const printed = query('qr-sheets-code-table-1')?.textContent ?? '';

      expect(printed).toContain('12');
      expect(printed).toContain('Main dining room');
      expect(printed).toContain('Sakura Kitchen');
    });

    it('prints the token in readable characters for a support call', () => {
      setInputs({ visibleRows: [ROWS[0]], selectedRows: [ROWS[0]] });

      expect(query('qr-sheets-code-table-1')?.textContent).toContain(
        '7K3QMXB2VZ0HNDR5TWY9FC8AJP',
      );
    });

    it('draws one A4 page for a selection that fits on one', () => {
      setInputs({ visibleRows: ROWS, selectedRows: ROWS });

      expect(
        fixture.nativeElement.querySelectorAll(
          '[data-testid^="qr-sheets-page-"]',
        ),
      ).toHaveLength(1);
    });

    it('splits stickers onto a second page at thirteen', () => {
      // Twelve to an A4 sheet. The preview pages have to be the printer's
      // pages: an owner feeding label paper wants to know it is two sheets
      // before they load the paper.
      setInputs({ visibleRows: manyRows(13), selectedRows: manyRows(13) });

      expect(query('qr-sheets-page-1')).not.toBeNull();
      expect(query('qr-sheets-page-2')).not.toBeNull();
      expect(query('qr-sheets-page-3')).toBeNull();
    });

    it('keeps twelve stickers on one page', () => {
      setInputs({ visibleRows: manyRows(12), selectedRows: manyRows(12) });

      expect(query('qr-sheets-page-2')).toBeNull();
    });

    it('gives every tent a page of its own', () => {
      setInputs({
        layout: 'tent',
        visibleRows: manyRows(3),
        selectedRows: manyRows(3),
      });

      expect(
        fixture.nativeElement.querySelectorAll(
          '[data-testid^="qr-sheets-page-"]',
        ),
      ).toHaveLength(3);
    });

    it('switches the sheet between the two layouts', () => {
      setInputs({ visibleRows: ROWS, selectedRows: ROWS, layout: 'tent' });

      expect(query('qr-sheets-sheet')?.className).toContain(
        'qr-sheets__sheet--tent',
      );

      setInputs({ layout: 'sticker' });

      expect(query('qr-sheets-sheet')?.className).toContain(
        'qr-sheets__sheet--sticker',
      );
    });
  });

  describe('choosing what to print', () => {
    it('refuses to print an empty selection', () => {
      setInputs({ visibleRows: ROWS, selectedRows: [] });

      expect(buttonDisabled('qr-sheets-print')).toBe(true);
    });

    it('prints once a table is ticked', () => {
      setInputs({ visibleRows: ROWS, selectedRows: [ROWS[0]] });

      expect(buttonDisabled('qr-sheets-print')).toBe(false);
    });

    it('asks the page to print', () => {
      const printed = jest.fn();

      component.printRequest.subscribe(printed);
      setInputs({ visibleRows: ROWS, selectedRows: ROWS });
      query('qr-sheets-print')?.click();

      expect(printed).toHaveBeenCalled();
    });

    it('reports one ticked table out of two as indeterminate', () => {
      // A partial selection rendered as unticked would claim the owner had
      // selected nothing while one sticker was queued.
      setInputs({
        visibleRows: ROWS,
        selectedRows: [ROWS[0]],
        selectedIds: new Set(['table-1']),
      });

      const all = fixture.debugElement.query(
        By.css('[data-testid="qr-sheets-select-all"]'),
      ).componentInstance;

      expect(all.checked).toBe(false);
      expect(all.indeterminate).toBe(true);
    });

    it('reports every table ticked as checked rather than indeterminate', () => {
      setInputs({
        visibleRows: ROWS,
        selectedRows: ROWS,
        selectedIds: new Set(['table-1', 'table-2']),
      });

      const all = fixture.debugElement.query(
        By.css('[data-testid="qr-sheets-select-all"]'),
      ).componentInstance;

      expect(all.checked).toBe(true);
      expect(all.indeterminate).toBe(false);
    });

    it('hides the room filter for a restaurant with one room', () => {
      setInputs({
        visibleRows: ROWS,
        selectedRows: ROWS,
        filterRooms: [{ id: 'room-1', name: 'Main dining room' }],
      });

      expect(query('qr-sheets-room')).toBeNull();
    });

    it('offers the room filter once there are two', () => {
      setInputs({
        visibleRows: ROWS,
        selectedRows: ROWS,
        filterRooms: [
          { id: 'room-1', name: 'Main dining room' },
          { id: 'room-2', name: 'Terrace' },
        ],
      });

      expect(query('qr-sheets-room')).not.toBeNull();
    });
  });

  describe('what it says when there is nothing to print', () => {
    it('explains an empty plan rather than showing a blank sheet', () => {
      setInputs({ visibleRows: [], selectedRows: [] });

      expect(query('qr-sheets-empty')).not.toBeNull();
      expect(query('qr-sheets-print')).toBeNull();
    });

    it('keeps a failed read out of the empty state', () => {
      // "This restaurant has no tables" is the wrong answer to a read that
      // failed, and it is the answer an owner would act on.
      setInputs({ loadFailed: true, visibleRows: [], selectedRows: [] });

      expect(query('qr-sheets-load-failed')).not.toBeNull();
      expect(query('qr-sheets-empty')).toBeNull();
    });

    it('names the tables that are out of service', () => {
      setInputs({
        visibleRows: ROWS,
        selectedRows: ROWS,
        disabledLabels: ['14', '15'],
      });

      expect(query('qr-sheets-disabled')).not.toBeNull();
    });

    it('names an enabled table the backend issued no code for', () => {
      // A row silently dropped from the sheet is one the owner finds missing
      // by walking the room with a sticker short.
      setInputs({
        visibleRows: ROWS,
        selectedRows: ROWS,
        missingTokenLabels: ['16'],
      });

      expect(query('qr-sheets-missing')).not.toBeNull();
    });
  });
});
