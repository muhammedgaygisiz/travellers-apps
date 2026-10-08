import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import {
  AlertButton,
  AlertController,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { ReportedBite } from 'model';
import { BiteReportsComponent } from '../bite-reports.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

const reported = (over: Partial<ReportedBite> = {}): ReportedBite => ({
  biteId: 'b1',
  exists: true,
  name: 'Ramen',
  place: 'Noodle Bar',
  description: '',
  tags: [],
  imageSrc: '',
  authorUid: 'author-1',
  authorDisplayName: 'Author',
  reportCount: 3,
  reasons: { spam: 1, notFood: 2, inappropriate: 0, harassment: 0, other: 0 },
  firstReportedAt: '2026-10-01T10:00:00.000Z',
  lastReportedAt: '2026-10-02T10:00:00.000Z',
  ...over,
});

describe(BiteReportsComponent.name, () => {
  let component: BiteReportsComponent;
  let fixture: ComponentFixture<BiteReportsComponent>;
  let ref: ComponentRef<BiteReportsComponent>;
  let alertController: AlertController;

  const setInputs = (inputs: Record<string, unknown>): void => {
    Object.entries(inputs).forEach(([key, value]) => ref.setInput(key, value));
    fixture.detectChanges();
  };

  const element = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  /** Presents the confirmation and returns its confirming button's handler. */
  const confirmHandler = async (
    act: () => Promise<void>,
  ): Promise<AlertButton['handler']> => {
    let buttons: AlertButton[] = [];
    const alert = document.createElement('ion-alert');
    jest.spyOn(alert, 'present').mockResolvedValue();
    jest.spyOn(alertController, 'create').mockImplementation((options) => {
      buttons = (options?.buttons ?? []).filter(
        (button): button is AlertButton => typeof button !== 'string',
      );
      return Promise.resolve(alert);
    });

    await act();

    return buttons.find((button) => button.role === 'destructive')?.handler;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    })
      .overrideComponent(BiteReportsComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(BiteReportsComponent);
    component = fixture.componentInstance;
    ref = fixture.componentRef;
    alertController = TestBed.inject(AlertController);
    fixture.detectChanges();
  });

  it('lists the reported Bites with their report counts', () => {
    setInputs({ loaded: true, reports: [reported()] });

    const list = element('admin-reports-list')?.textContent ?? '';
    expect(list).toContain('Ramen');
    expect(list).toContain('3');
  });

  it('says the queue is empty only once it has loaded', () => {
    expect(element('admin-reports-empty')).toBeNull();

    setInputs({ loaded: true });

    expect(element('admin-reports-empty')).not.toBeNull();
  });

  it('says the queue failed rather than that it is empty', () => {
    setInputs({ loaded: true, failed: true });

    expect(element('admin-reports-failed')).not.toBeNull();
    expect(element('admin-reports-empty')).toBeNull();
  });

  it('shows the reasons most frequent first, leaving out the unused ones', () => {
    setInputs({ reports: [reported()], selected: reported() });

    expect(component.reasonCounts()).toEqual([
      { reason: 'notFood', count: 2 },
      { reason: 'spam', count: 1 },
    ]);
  });

  it('holds the decisions that need a reason until one is given', () => {
    setInputs({ reports: [reported()], selected: reported() });
    const disabled = (testId: string): boolean =>
      (element(testId) as HTMLIonButtonElement | null)?.disabled ?? false;

    expect(disabled('admin-reports-dismiss')).toBe(true);
    expect(disabled('admin-reports-delete')).toBe(true);

    component.onReasonChange('It is food.');
    fixture.detectChanges();

    expect(disabled('admin-reports-dismiss')).toBe(false);
    expect(disabled('admin-reports-delete')).toBe(false);
  });

  it('dismisses with the reason once confirmed', async () => {
    setInputs({ reports: [reported()], selected: reported() });
    component.onReasonChange('  It is food.  ');
    const emit = jest.spyOn(component.dismissReports, 'emit');

    const confirm = await confirmHandler(() => component.onDismiss());
    expect(emit).not.toHaveBeenCalled();
    confirm?.(undefined);

    expect(emit).toHaveBeenCalledWith({ biteId: 'b1', reason: 'It is food.' });
  });

  it('deletes with the reason once confirmed', async () => {
    setInputs({ reports: [reported()], selected: reported() });
    component.onReasonChange('Not food');
    const emit = jest.spyOn(component.deleteBite, 'emit');

    const confirm = await confirmHandler(() => component.onDelete());
    confirm?.(undefined);

    expect(emit).toHaveBeenCalledWith({ biteId: 'b1', reason: 'Not food' });
  });

  it('blocks the author once confirmed', async () => {
    setInputs({ reports: [reported()], selected: reported() });
    const emit = jest.spyOn(component.blockAuthor, 'emit');

    const confirm = await confirmHandler(() => component.onBlockAuthor());
    confirm?.(undefined);

    expect(emit).toHaveBeenCalledWith('author-1');
  });

  it('does not offer the same block twice', () => {
    setInputs({
      reports: [reported()],
      selected: reported(),
      authorBlocked: true,
    });

    expect(component.canBlock()).toBe(false);
  });

  it('offers no block for a Bite whose author deleted their account', () => {
    setInputs({
      reports: [reported({ authorUid: '' })],
      selected: reported({ authorUid: '' }),
    });

    expect(element('admin-reports-block')).toBeNull();
  });

  it('offers only dismissal for a Bite that no longer exists', () => {
    const gone = reported({ exists: false, name: '' });
    setInputs({ reports: [gone], selected: gone });

    expect(element('admin-reports-gone')).not.toBeNull();
    expect(element('admin-reports-delete')).toBeNull();
    expect(element('admin-reports-dismiss')).not.toBeNull();
  });

  it('clears the reason when another Bite is selected', () => {
    component.onReasonChange('Not food');

    component.onSelect(reported({ biteId: 'b2' }));

    expect(component.reason()).toBe('');
  });

  describe('guards', () => {
    let create: jest.SpyInstance;

    beforeEach(() => {
      create = jest.spyOn(alertController, 'create');
    });

    it('has no reasons to show without a selection', () => {
      expect(component.reasonCounts()).toEqual([]);
    });

    it('treats a reason missing from the counts as none', () => {
      const partial = reported({
        reasons: { spam: 2 } as ReportedBite['reasons'],
      });
      setInputs({ selected: partial });

      expect(component.reasonCounts()).toEqual([{ reason: 'spam', count: 2 }]);
    });

    it('asks nothing without a selection', async () => {
      await component.onDismiss();
      await component.onDelete();
      await component.onBlockAuthor();

      expect(create).not.toHaveBeenCalled();
    });

    it('asks nothing for a dismissal or deletion without a reason', async () => {
      setInputs({ selected: reported() });

      await component.onDismiss();
      await component.onDelete();

      expect(create).not.toHaveBeenCalled();
    });

    it('asks nothing for a deletion of a Bite that is gone', async () => {
      setInputs({ selected: reported({ exists: false }) });
      component.onReasonChange('Gone');

      await component.onDelete();

      expect(create).not.toHaveBeenCalled();
    });

    it('asks nothing for a block already made', async () => {
      setInputs({ selected: reported(), authorBlocked: true });

      await component.onBlockAuthor();

      expect(create).not.toHaveBeenCalled();
    });

    it('names the account by its uid when it has no display name', async () => {
      setInputs({ selected: reported({ authorDisplayName: '' }) });
      const alert = document.createElement('ion-alert');
      jest.spyOn(alert, 'present').mockResolvedValue();
      create.mockResolvedValue(alert);

      await component.onBlockAuthor();

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ subHeader: 'author-1' }),
      );
    });

    it('names the Bite by its id when it has no name', async () => {
      setInputs({ selected: reported({ name: '' }) });
      component.onReasonChange('Fine');
      const alert = document.createElement('ion-alert');
      jest.spyOn(alert, 'present').mockResolvedValue();
      create.mockResolvedValue(alert);

      await component.onDismiss();

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ subHeader: 'b1' }),
      );
    });
  });
});
